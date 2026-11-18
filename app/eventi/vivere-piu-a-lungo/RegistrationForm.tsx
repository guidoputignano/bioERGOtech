"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  SESSIONS,
  CATEGORIE,
  CONSENSO_PRIVACY_TESTO,
  CONSENSO_MARKETING_TESTO,
  giornateConArticolo,
  type CategoriaValue,
  type SessionSlug,
} from "./content";
import { IscrizioneConfermata, type DatiConferma } from "./IscrizioneConfermata";
import {
  CAMPI,
  ICONA_CATEGORIA,
  MESSAGGIO_RETE,
  MESSAGGIO_TEMPO,
  STILE_MODULO,
  categoriaDaParametro,
  comportamentoScroll,
  etichettaOrganizzazione,
  ids,
  leggiPosti,
  leggiRisposta,
  mostraClasse,
  statoPosti,
  validaModulo,
  type Campo,
  type ErroriModulo,
  type Posti,
} from "./modulo-utils";

const INFORMATIVA_HREF = "/legal/informativa-privacy";
/** Oltre questo tempo si smette di aspettare e si propone di riprovare. */
const TEMPO_MASSIMO_MS = 30_000;

/**
 * Legge ?cat dall'indirizzo e lo porta nel modulo, all'arrivo e a ogni
 * cambio: i link dell'hero ("?cat=studente#iscrizione") cambiano l'URL senza
 * rimontare la pagina. È l'unico pezzo che usa useSearchParams, dentro un
 * Suspense senza fallback: il modulo vero si disegna subito, anche lato
 * server, senza aspettare i parametri.
 */
function SincronizzaCategoria({ onCategoria }: { onCategoria: (c: CategoriaValue) => void }) {
  const cat = useSearchParams()?.get("cat") ?? null;
  useEffect(() => {
    const c = categoriaDaParametro(cat);
    if (c) onCategoria(c);
  }, [cat, onCategoria]);
  return null;
}

const NUOVA_SCHEDA = <span className="sr-only"> (si apre in una nuova scheda)</span>;

/** Il testo del consenso, con "l'informativa" che porta all'informativa. */
function TestoConsensoPrivacy() {
  const chiave = "l'informativa";
  const i = CONSENSO_PRIVACY_TESTO.indexOf(chiave);
  const link = (testo: string) => (
    <a href={INFORMATIVA_HREF} target="_blank" rel="noopener noreferrer">
      {testo}
      {NUOVA_SCHEDA}
    </a>
  );
  if (i === -1) {
    return (
      <>
        {CONSENSO_PRIVACY_TESTO} {link("Leggi l'informativa")}
      </>
    );
  }
  return (
    <>
      {CONSENSO_PRIVACY_TESTO.slice(0, i)}
      {link(chiave)}
      {CONSENSO_PRIVACY_TESTO.slice(i + chiave.length)}
    </>
  );
}

function ErroreCampo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="vpl-errore">
      <i className="fas fa-circle-exclamation" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Invio sulla tastiera: al campo di testo successivo, invece di inviare a metà. */
function avanti(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  const form = e.currentTarget.form;
  if (!form) return;
  const campi = Array.from(form.querySelectorAll<HTMLInputElement>("input.vpl-input"));
  const prossimo = campi[campi.indexOf(e.currentTarget) + 1];
  if (prossimo) prossimo.focus();
  else e.currentTarget.blur();
}

type ErroreServer = { campo?: Campo; messaggio: string; valore?: string };

export function RegistrationForm() {
  const [sessioni, setSessioni] = useState<SessionSlug[]>([]);
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [emailUscita, setEmailUscita] = useState(false);
  /** L'indirizzo per cui si è scelto "È giusto così". */
  const [emailConfermata, setEmailConfermata] = useState<string | null>(null);
  const [telefono, setTelefono] = useState("");
  const [categoria, setCategoria] = useState<CategoriaValue | "">("");
  const [organizzazione, setOrganizzazione] = useState("");
  const [classe, setClasse] = useState("");
  const [startupName, setStartupName] = useState("");
  const [startupUrl, setStartupUrl] = useState("");
  const [startupDesc, setStartupDesc] = useState("");
  const [note, setNote] = useState("");
  const [notaAperta, setNotaAperta] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [consensoMarketing, setConsensoMarketing] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [posti, setPosti] = useState<Record<string, Posti>>({});
  /**
   * Le giornate già concluse, calcolate nel browser dopo il montaggio: la
   * pagina è statica e non sa che ora è. Restano in vista ma non si scelgono.
   */
  const [concluse, setConcluse] = useState<readonly string[]>([]);
  /**
   * Quanto l'orologio del server è avanti (o indietro) rispetto a quello del
   * telefono, letto dall'intestazione Date della risposta dei posti. Un
   * telefono con la data sbagliata non deve vedere le giornate "concluse"
   * prima del tempo (e non poter più iscriversi).
   */
  const [scartoOrologio, setScartoOrologio] = useState(0);
  const [invio, setInvio] = useState(false);
  /** Quante volte si è provato a inviare: da 1 in poi gli errori si vedono e si aggiornano dal vivo. */
  const [tentativi, setTentativi] = useState(0);
  const [erroreServer, setErroreServer] = useState<ErroreServer | null>(null);
  const [esito, setEsito] = useState<DatiConferma | null>(null);
  /** Dopo "Iscrivi un'altra persona": si dice che giornate e categoria sono rimaste. */
  const [altraPersona, setAltraPersona] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const giorniRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const riepilogoRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const campiRef = useRef<Partial<Record<Campo, HTMLInputElement | null>>>({});
  const registra = (c: Campo) => (el: HTMLInputElement | null) => {
    campiRef.current[c] = el;
  };

  // Chi è già entrato nel Member Portal trova nome ed email già scritti.
  // Non sovrascrive quello che la persona ha già digitato.
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

  // I posti sono un di più: se la rotta non risponde, il modulo funziona lo stesso.
  const caricaPosti = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/eventi/seats", { cache: "no-store", signal });
      const oraServer = Date.parse(res.headers.get("date") ?? "");
      if (!Number.isNaN(oraServer)) setScartoOrologio(oraServer - Date.now());
      if (!res.ok) return;
      setPosti(leggiPosti(await res.json()));
    } catch {
      /* il contatore non blocca l'iscrizione */
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
        setSessioni((p) => (p.some((s) => finite.includes(s)) ? p.filter((s) => !finite.includes(s)) : p));
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
  const etichettaOrg = etichettaOrganizzazione(categoria);
  const conClasse = mostraClasse(categoria);
  const conStartup = categoria === "startup";
  const giornateScelte = SESSIONS.map((s) => s.slug).filter((s) => sessioni.includes(s));

  const datiDaValidare = {
    sessioni,
    nome,
    cognome,
    email,
    emailConfermata: confermata,
    categoria,
    startupName,
    consensoPrivacy,
  };
  const erroriClient: ErroriModulo = tentativi > 0 ? validaModulo(datiDaValidare) : {};

  /** Il valore di un campo, per sapere se un errore della rotta vale ancora. */
  const valoreCampo = (c: Campo): string => {
    switch (c) {
      case "sessioni":
        return [...sessioni].sort().join(",");
      case "nome":
        return nome;
      case "cognome":
        return cognome;
      case "email":
        return email.trim();
      case "categoria":
        return categoria;
      case "startup_name":
        return startupName;
      case "consenso_privacy":
        return String(consensoPrivacy);
    }
  };

  // L'errore della rotta su un campo resta finché quel campo non cambia.
  const erroreCampoServer =
    erroreServer?.campo && valoreCampo(erroreServer.campo) === erroreServer.valore ? erroreServer : null;
  const errori: ErroriModulo = {
    ...(erroreCampoServer?.campo ? { [erroreCampoServer.campo]: erroreCampoServer.messaggio } : {}),
    ...erroriClient,
  };
  const erroreGenerale = erroreServer && !erroreServer.campo ? erroreServer.messaggio : null;
  const elencoErrori = CAMPI.filter((c) => errori[c]);
  const mostraRiepilogo = tentativi > 0 && (elencoErrori.length > 0 || Boolean(erroreGenerale));
  const emailNonValida = Boolean(errori.email) || Boolean(mostraRefuso && refuso?.impossibile);

  /* ── Focus ── */

  const elementoCampo = (c: Campo): HTMLElement | null => {
    if (c === "sessioni") return giorniRef.current?.querySelector<HTMLInputElement>("input:not(:disabled)") ?? null;
    if (c === "categoria") {
      return (
        chipsRef.current?.querySelector<HTMLInputElement>("input:checked") ??
        chipsRef.current?.querySelector<HTMLInputElement>("input") ??
        null
      );
    }
    return campiRef.current[c] ?? null;
  };

  const focalizza = (c: Campo) => {
    const el = elementoCampo(c);
    if (el) el.focus();
    else riepilogoRef.current?.focus();
  };

  /* ── Azioni ── */

  const alternaGiornata = (slug: SessionSlug) =>
    setSessioni((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));

  /**
   * La categoria scelta a mano. Se è diversa da quella di ?cat, il parametro
   * esce dall'indirizzo (senza ricaricare): così un nuovo clic su "Sei uno
   * studente? Iscriviti qui" cambia di nuovo l'URL e riporta la categoria.
   */
  const scegliCategoria = (c: CategoriaValue) => {
    setCategoria(c);
    try {
      const url = new URL(window.location.href);
      const cat = url.searchParams.get("cat");
      if (cat !== null && categoriaDaParametro(cat) !== c) {
        url.searchParams.delete("cat");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      /* l'indirizzo resta com'è: la scelta vale lo stesso */
    }
  };

  const usaSuggerimento = (indirizzo: string) => {
    setEmail(indirizzo);
    setEmailConfermata(null);
    requestAnimationFrame(() => campiRef.current.email?.focus());
  };

  const confermaEmail = () => {
    setEmailConfermata(email.trim());
    requestAnimationFrame(() => campiRef.current.email?.focus());
  };

  const apriNota = () => {
    setNotaAperta(true);
    requestAnimationFrame(() => noteRef.current?.focus());
  };

  const invia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invio) return;
    setEmailUscita(true);
    setErroreServer(null);
    setTentativi((n) => n + 1);

    const erroriOra = validaModulo(datiDaValidare);
    const primo = CAMPI.find((c) => erroriOra[c]);
    if (primo) {
      requestAnimationFrame(() => focalizza(primo));
      return;
    }

    // Si mandano solo i campi che la categoria mostra: niente classe rimasta
    // da una scelta precedente.
    const payload = {
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      categoria,
      // Per una startup l'organizzazione è la startup stessa.
      organizzazione: conStartup ? startupName.trim() : etichettaOrg ? organizzazione.trim() : "",
      classe: conClasse ? classe.trim() : "",
      startup_name: conStartup ? startupName.trim() : "",
      startup_url: conStartup ? startupUrl.trim() : "",
      startup_desc: conStartup ? startupDesc.trim() : "",
      referente: "",
      note: note.trim(),
      sessioni: giornateScelte,
      consenso_privacy: consensoPrivacy,
      consenso_marketing: consensoMarketing,
      website,
      email_confermata: confermata,
    };

    setInvio(true);
    const controllo = new AbortController();
    const timer = window.setTimeout(() => controllo.abort(), TEMPO_MASSIMO_MS);
    try {
      const res = await fetch("/api/eventi/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controllo.signal,
      });
      const risposta = await leggiRisposta(res);
      if (!risposta.ok) {
        const { campo, errore } = risposta;
        setErroreServer({ campo, messaggio: errore, valore: campo ? valoreCampo(campo) : undefined });
        requestAnimationFrame(() => (campo ? focalizza(campo) : riepilogoRef.current?.focus()));
        return;
      }
      setAltraPersona(false);
      setEsito({ ...risposta.esito, email: payload.email.toLowerCase(), nome: payload.nome });
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
   * "Iscrivi un'altra persona": via i dati personali e i consensi, che ognuno
   * dà per sé. Restano giornate, categoria, scuola o organizzazione, che
   * spesso sono le stesse (un genitore con il figlio, un docente con la
   * classe), e un avviso lo dice.
   */
  const nuovaIscrizione = () => {
    setNome("");
    setCognome("");
    setEmail("");
    setTelefono("");
    setNote("");
    setNotaAperta(false);
    setConsensoPrivacy(false);
    setConsensoMarketing(false);
    setEmailUscita(false);
    setEmailConfermata(null);
    setErroreServer(null);
    setTentativi(0);
    setAltraPersona(true);
    setEsito(null);
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: "start", behavior: comportamentoScroll() });
      campiRef.current.nome?.focus({ preventScroll: true });
    });
  };

  /* ── Markup ── */

  return (
    <div className="vpl-wrap">
      <style>{STILE_MODULO}</style>
      <Suspense fallback={null}>
        <SincronizzaCategoria onCategoria={setCategoria} />
      </Suspense>

      <div ref={cardRef} className="card vpl-card">
        {esito ? (
          <IscrizioneConfermata dati={esito} onAltraPersona={nuovaIscrizione} />
        ) : (
          <form
            onSubmit={invia}
            noValidate
            className="vpl-form"
            aria-label="Iscrizione all'evento"
            aria-busy={invio || undefined}
          >
            {/* Honeypot: invisibile agli umani, riempito dai bot. */}
            <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
              <label htmlFor="website">Sito web</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="vpl-intro">
              <span className="icon-circle icon-circle-primary" aria-hidden="true">
                <i className="fas fa-ticket" />
              </span>
              {/* Il "come funziona" è già nell'introduzione della sezione, sopra la card. */}
              <p style={{ margin: 0 }}>
                <span className="vpl-intro-titolo">Iscrizione gratuita</span>
              </p>
            </div>

            {altraPersona && (
              <p className="vpl-avviso-nuova">
                <i className="fas fa-user-plus" aria-hidden="true" />
                <span>
                  Nuova iscrizione. Abbiamo tenuto le giornate e la categoria scelte prima: cambiale se servono.
                </span>
              </p>
            )}

            {/* ── Quali giornate? ── */}
            <fieldset
              className="vpl-fieldset"
              aria-describedby={ids("vpl-giorni-aiuto", errori.sessioni && "vpl-giorni-errore")}
            >
              <legend className="vpl-legend">Quali giornate?</legend>
              <p id="vpl-giorni-aiuto" className="vpl-aiuto">
                {concluse.length === SESSIONS.length
                  ? "Le giornate si sono concluse: le iscrizioni sono chiuse."
                  : concluse.length > 0
                    ? "Puoi scegliere solo le giornate non ancora concluse. L'ingresso è gratuito."
                    : "Puoi sceglierne una o tutte e due. L'ingresso è gratuito."}
              </p>
              <div ref={giorniRef} className="vpl-giorni">
                {SESSIONS.map((s) => {
                  const conclusa = concluse.includes(s.slug);
                  const scelto = !conclusa && sessioni.includes(s.slug);
                  const stato = conclusa ? null : statoPosti(posti[s.slug], s.capienza);
                  const base = `vpl-g-${s.slug}`;
                  return (
                    <label
                      key={s.slug}
                      className="vpl-giorno"
                      data-scelto={scelto}
                      data-conclusa={conclusa || undefined}
                      data-errore={!conclusa && Boolean(errori.sessioni)}
                    >
                      <input
                        type="checkbox"
                        className="vpl-check"
                        name="sessioni"
                        value={s.slug}
                        checked={scelto}
                        disabled={conclusa}
                        onChange={() => alternaGiornata(s.slug)}
                        aria-labelledby={`${base}-data`}
                        aria-describedby={ids(`${base}-dettagli`, errori.sessioni && "vpl-giorni-errore")}
                        aria-invalid={!conclusa && errori.sessioni ? true : undefined}
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
                          <span className="vpl-posti" data-tipo={conclusa ? "conclusa" : stato?.tipo}>
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
              {errori.sessioni && (
                <div style={{ marginTop: 10 }}>
                  <ErroreCampo id="vpl-giorni-errore">{errori.sessioni}</ErroreCampo>
                </div>
              )}
            </fieldset>

            {/* ── Dati personali ── */}
            <div className="vpl-gruppo">
              <div className="vpl-griglia2">
                <div className="vpl-campo">
                  <label htmlFor="vpl-nome" className="vpl-label">
                    Nome
                  </label>
                  <input
                    ref={registra("nome")}
                    id="vpl-nome"
                    name="nome"
                    type="text"
                    className="vpl-input"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    maxLength={80}
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    onKeyDown={avanti}
                    aria-invalid={errori.nome ? true : undefined}
                    aria-describedby={errori.nome ? "vpl-nome-errore" : undefined}
                  />
                  {errori.nome && <ErroreCampo id="vpl-nome-errore">{errori.nome}</ErroreCampo>}
                </div>
                <div className="vpl-campo">
                  <label htmlFor="vpl-cognome" className="vpl-label">
                    Cognome
                  </label>
                  <input
                    ref={registra("cognome")}
                    id="vpl-cognome"
                    name="cognome"
                    type="text"
                    className="vpl-input"
                    autoComplete="family-name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    maxLength={80}
                    required
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    onKeyDown={avanti}
                    aria-invalid={errori.cognome ? true : undefined}
                    aria-describedby={errori.cognome ? "vpl-cognome-errore" : undefined}
                  />
                  {errori.cognome && <ErroreCampo id="vpl-cognome-errore">{errori.cognome}</ErroreCampo>}
                </div>
              </div>

              <div className="vpl-campo">
                <label htmlFor="vpl-email" className="vpl-label">
                  Email
                </label>
                <p id="vpl-email-aiuto" className="vpl-aiuto">
                  Ti mandiamo qui il biglietto con il QR code.
                </p>
                <input
                  ref={registra("email")}
                  id="vpl-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  className="vpl-input"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailUscita(true)}
                  onKeyDown={avanti}
                  aria-invalid={emailNonValida || undefined}
                  aria-describedby={ids(
                    "vpl-email-aiuto",
                    mostraRefuso ? "vpl-email-refuso" : errori.email && "vpl-email-errore",
                  )}
                />
                {/* Un refuso nel dominio non si nota scrivendo, e il biglietto
                    non arriverebbe mai. */}
                {mostraRefuso && refuso ? (
                  <div
                    id="vpl-email-refuso"
                    className="vpl-refuso"
                    data-tipo={refuso.impossibile || errori.email ? "errore" : "avviso"}
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
                            biglietto.
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
                  errori.email && <ErroreCampo id="vpl-email-errore">{errori.email}</ErroreCampo>
                )}
              </div>

              <div className="vpl-campo">
                <label htmlFor="vpl-telefono" className="vpl-label">
                  Telefono <span className="vpl-opz">(facoltativo)</span>
                </label>
                <p id="vpl-telefono-aiuto" className="vpl-aiuto">
                  Solo per comunicazioni urgenti sull&apos;evento.
                </p>
                <input
                  id="vpl-telefono"
                  name="telefono"
                  type="tel"
                  inputMode="tel"
                  className="vpl-input"
                  autoComplete="tel"
                  enterKeyHint="next"
                  maxLength={30}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onKeyDown={avanti}
                  aria-describedby="vpl-telefono-aiuto"
                />
              </div>
            </div>

            {/* ── Chi sei? ── */}
            <fieldset
              className="vpl-fieldset"
              aria-describedby={ids("vpl-chi-aiuto", errori.categoria && "vpl-chi-errore")}
            >
              <legend className="vpl-legend">Chi sei?</legend>
              <p id="vpl-chi-aiuto" className="vpl-aiuto">
                Ci aiuta a organizzare l&apos;accoglienza.
              </p>
              <div ref={chipsRef} className="vpl-chips" data-errore={Boolean(errori.categoria)}>
                {CATEGORIE.map((c) => {
                  const scelta = categoria === c.value;
                  return (
                    <label key={c.value} className="vpl-chip" data-scelto={scelta}>
                      <input
                        type="radio"
                        name="categoria"
                        value={c.value}
                        checked={scelta}
                        onChange={() => scegliCategoria(c.value)}
                        required
                        aria-describedby={errori.categoria ? "vpl-chi-errore" : undefined}
                      />
                      <i className={`fas ${scelta ? "fa-circle-check" : ICONA_CATEGORIA[c.value]}`} aria-hidden="true" />
                      {c.label}
                    </label>
                  );
                })}
              </div>
              {errori.categoria && (
                <div style={{ marginTop: 10 }}>
                  <ErroreCampo id="vpl-chi-errore">{errori.categoria}</ErroreCampo>
                </div>
              )}
            </fieldset>

            {categoria && categoria !== "pubblico" && (
              <div className="vpl-pannello" key={categoria}>
                {categoria === "studente" && (
                  <p className="vpl-nota">
                    <i className="fas fa-circle-info" aria-hidden="true" />
                    <span>
                      Se hai meno di 14 anni, chiedi a un genitore di iscriverti. Ogni persona ha bisogno di un indirizzo
                      email diverso: se in famiglia ne avete uno solo, scrivici a{" "}
                      <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>.
                    </span>
                  </p>
                )}
                {categoria === "scuola_docente" && (
                  <p className="vpl-nota">
                    <i className="fas fa-circle-info" aria-hidden="true" />
                    <span>
                      Ogni studente si iscrive con il proprio indirizzo email. Per un gruppo classe numeroso scrivici
                      a <a href="mailto:info@bioergotech.org">info@bioergotech.org</a>.
                    </span>
                  </p>
                )}

                {etichettaOrg && (
                  <div className={conClasse ? "vpl-griglia-scuola" : undefined}>
                    <div className="vpl-campo">
                      <label htmlFor="vpl-organizzazione" className="vpl-label">
                        {etichettaOrg} <span className="vpl-opz">(facoltativo)</span>
                      </label>
                      <input
                        id="vpl-organizzazione"
                        name="organizzazione"
                        type="text"
                        className="vpl-input"
                        autoComplete="organization"
                        enterKeyHint="next"
                        maxLength={160}
                        value={organizzazione}
                        onChange={(e) => setOrganizzazione(e.target.value)}
                        onKeyDown={avanti}
                      />
                    </div>
                    {conClasse && (
                      <div className="vpl-campo">
                        <label htmlFor="vpl-classe" className="vpl-label">
                          Classe <span className="vpl-opz">(facoltativo)</span>
                        </label>
                        <input
                          id="vpl-classe"
                          name="classe"
                          type="text"
                          className="vpl-input"
                          autoComplete="off"
                          autoCapitalize="characters"
                          enterKeyHint="next"
                          maxLength={20}
                          placeholder="Es. 4A"
                          value={classe}
                          onChange={(e) => setClasse(e.target.value)}
                          onKeyDown={avanti}
                        />
                      </div>
                    )}
                  </div>
                )}

                {conStartup && (
                  <>
                    <div className="vpl-campo">
                      <label htmlFor="vpl-startup-nome" className="vpl-label">
                        Nome della startup
                      </label>
                      <input
                        ref={registra("startup_name")}
                        id="vpl-startup-nome"
                        name="startup_name"
                        type="text"
                        className="vpl-input"
                        autoComplete="organization"
                        enterKeyHint="next"
                        maxLength={120}
                        required
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                        onKeyDown={avanti}
                        aria-invalid={errori.startup_name ? true : undefined}
                        aria-describedby={errori.startup_name ? "vpl-startup-nome-errore" : undefined}
                      />
                      {errori.startup_name && (
                        <ErroreCampo id="vpl-startup-nome-errore">{errori.startup_name}</ErroreCampo>
                      )}
                    </div>
                    <div className="vpl-campo">
                      <label htmlFor="vpl-startup-url" className="vpl-label">
                        Sito web <span className="vpl-opz">(facoltativo)</span>
                      </label>
                      <input
                        id="vpl-startup-url"
                        name="startup_url"
                        type="url"
                        inputMode="url"
                        className="vpl-input"
                        autoComplete="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        maxLength={300}
                        placeholder="https://"
                        value={startupUrl}
                        onChange={(e) => setStartupUrl(e.target.value)}
                        onKeyDown={avanti}
                      />
                    </div>
                    <div className="vpl-campo">
                      <label htmlFor="vpl-startup-desc" className="vpl-label">
                        Di che cosa si occupa <span className="vpl-opz">(facoltativo)</span>
                      </label>
                      <p id="vpl-startup-desc-aiuto" className="vpl-aiuto">
                        Due righe bastano.
                      </p>
                      <textarea
                        id="vpl-startup-desc"
                        name="startup_desc"
                        className="vpl-input"
                        rows={3}
                        maxLength={1000}
                        value={startupDesc}
                        onChange={(e) => setStartupDesc(e.target.value)}
                        aria-describedby="vpl-startup-desc-aiuto"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Nota ── */}
            {notaAperta ? (
              <div className="vpl-campo">
                <label htmlFor="vpl-note" className="vpl-label">
                  Nota <span className="vpl-opz">(facoltativo)</span>
                </label>
                <p id="vpl-note-aiuto" className="vpl-aiuto">
                  Per esempio un&apos;esigenza di accessibilità.
                </p>
                <textarea
                  ref={noteRef}
                  id="vpl-note"
                  name="note"
                  className="vpl-input"
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-describedby="vpl-note-aiuto"
                />
              </div>
            ) : (
              <button type="button" className="vpl-link-btn" onClick={apriNota}>
                <i className="fas fa-plus" aria-hidden="true" />{" "}
                Aggiungi una nota (facoltativo)
              </button>
            )}

            {/* ── Consensi ── */}
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
                  aria-describedby={errori.consenso_privacy ? "vpl-privacy-errore" : undefined}
                />
                <span>
                  <TestoConsensoPrivacy />
                </span>
              </label>
              {errori.consenso_privacy && (
                <ErroreCampo id="vpl-privacy-errore">{errori.consenso_privacy}</ErroreCampo>
              )}
              <label className="vpl-consenso">
                <input
                  type="checkbox"
                  className="vpl-check"
                  name="consenso_marketing"
                  checked={consensoMarketing}
                  onChange={(e) => setConsensoMarketing(e.target.checked)}
                />
                <span>
                  {CONSENSO_MARKETING_TESTO}
                  <span className="vpl-tag">Facoltativo</span>
                </span>
              </label>
            </div>

            {/* ── Invio ── */}
            <div className="vpl-invio">
              <div role="alert" className="vpl-riepilogo-slot">
                {mostraRiepilogo && (
                  <div key={tentativi} ref={riepilogoRef} tabIndex={-1} className="vpl-riepilogo">
                    <p className="vpl-riepilogo-titolo">
                      <i className="fas fa-circle-exclamation" aria-hidden="true" />
                      {elencoErrori.length > 0 ? "Prima di inviare, completa questi punti:" : "L'iscrizione non è partita"}
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
                  <span>Ti iscrivi per {giornateConArticolo(giornateScelte)}.</span>
                </p>
              )}

              <button type="submit" className="btn-primary vpl-invia" disabled={invio} aria-busy={invio || undefined}>
                {invio ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />{" "}
                    Invio in corso…
                  </>
                ) : (
                  <>
                    Conferma l&apos;iscrizione{" "}
                    <i className="fas fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="sr-only" aria-live="polite">
                {invio ? "Invio dell'iscrizione in corso." : ""}
              </p>

              <p className="vpl-piede">
                Con l&apos;iscrizione attivi anche un account gratuito nel Member Portal della Fondazione.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
