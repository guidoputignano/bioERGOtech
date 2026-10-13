"use client";

/**
 * Il riquadro dell'iscrizione nella pagina di un talk.
 *
 * La pagina e statica, quindi tutto cio che dipende da chi la guarda passa
 * da qui: chiede alla rotta a che punto e (`GET`), iscrive con un clic
 * (`POST`), annulla (`DELETE`). Gli stati, nell'ordine in cui si
 * controllano: concluso, iscrizioni non ancora attive (prima della
 * migrazione), accesso da fare, non partecipante, iscritto, posti esauriti,
 * iscrivibile.
 *
 * Il link della riunione non e nelle props e non e nella pagina: arriva solo
 * dalla risposta della rotta, e solo a chi e iscritto e ancora idoneo.
 *
 * Il calendario compare solo a chi e iscritto. Il link per Google Calendar
 * lo costruisce il server e arriva nella stessa risposta
 * (`calendarioGoogle`), con il link della riunione dentro; il file .ics lo
 * contiene se la rotta riconosce un iscritto dalla sessione, che il browser
 * manda con il download. Nessuno dei due si costruisce qui con dati della
 * pagina.
 *
 * Importa i testi da `testi.ts` e mai da `content.ts`, che contiene il link:
 * vedi la nota in cima a quel file.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TESTI_TALK as T } from "./testi";
// Solo il tipo: il modulo e del server.
import type { StatoTalk } from "@/lib/eventi/talk-server";

type Props = {
  slug: string;
  fine: string;
  icsUrl: string;
  loginHref: string;
  liceiPath: string;
  universitaPath: string;
};

const box: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border-color)",
  borderRadius: 16,
  boxShadow: "var(--shadow)",
  padding: 24,
};

const titoloStato: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--text-dark)",
  margin: "0 0 6px",
  lineHeight: 1.35,
};

const nota: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--text-mid)",
  lineHeight: 1.65,
  margin: 0,
};

/**
 * Bottone a tutta larghezza. Il testo si centra a mano: `/assets/css/main.css`
 * riscrive `.btn-primary` e `.btn-outline` come `inline-block`, e il
 * `justify-content` del design system da solo non basta.
 */
const pieno: React.CSSProperties = { width: "100%", textAlign: "center", justifyContent: "center" };

const linkTesto: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 13,
  color: "var(--text-mid)",
  textDecoration: "underline",
  cursor: "pointer",
  fontFamily: "inherit",
};

/**
 * Google Calendar e il file .ics, solo per chi e iscritto. `googleUrl` e
 * quello che il server ha mandato a questo iscritto; senza, resta il .ics.
 */
function Calendario({
  googleUrl,
  icsUrl,
  conLink,
}: {
  googleUrl: string | null;
  icsUrl: string;
  conLink: boolean;
}) {
  const stile: React.CSSProperties = { ...pieno, padding: "11px 18px", fontSize: 13.5 };
  return (
    <div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#0A7A66",
          margin: "0 0 8px",
        }}
      >
        {T.aggiungiCalendario}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {googleUrl && (
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={stile}>
            <i className="fab fa-google" aria-hidden="true" /> {T.googleCalendar}
          </a>
        )}
        <a href={icsUrl} className="btn-outline" style={stile} download>
          <i className="fas fa-calendar-plus" aria-hidden="true" /> {T.ics}
        </a>
      </div>
      {conLink && <p style={{ ...nota, fontSize: 12.5, margin: "8px 0 0" }}>{T.calendarioConLink}</p>}
    </div>
  );
}

export function IscrizioneTalk({
  slug,
  fine,
  icsUrl,
  loginHref,
  liceiPath,
  universitaPath,
}: Props) {
  const [stato, setStato] = useState<StatoTalk | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  // L'orologio del browser decide subito se il talk e passato, senza
  // aspettare la rotta: la pagina e statica e non lo sa.
  const [conclusoLocale, setConclusoLocale] = useState(false);

  const url = `/api/eventi/talk/${encodeURIComponent(slug)}/iscrizione`;

  const carica = useCallback(async () => {
    setErrore(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || T.erroreCaricamento);
      setStato(data as StatoTalk);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : T.erroreCaricamento);
    }
  }, [url]);

  useEffect(() => {
    setConclusoLocale(Date.now() >= new Date(fine).getTime());
    carica();
  }, [carica, fine]);

  const agisci = async (method: "POST" | "DELETE") => {
    if (method === "DELETE" && !confirm(T.annullaConferma)) return;
    setOccupato(true);
    setErrore(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) {
        // Le iscrizioni non ancora attive non sono un errore di chi clicca:
        // il riquadro torna allo stato giusto e lo dice.
        if (data.disponibile === false) setStato((p) => (p ? { ...p, disponibile: false } : p));
        throw new Error(data.error || "Operazione non riuscita.");
      }
      setStato(data as StatoTalk);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  const messaggioErrore = errore && stato && (
    <p role="alert" style={{ color: "#B44A5E", fontSize: 13.5, margin: "12px 0 0", lineHeight: 1.6 }}>
      {errore}
    </p>
  );

  // ── Concluso ──
  if (conclusoLocale || stato?.concluso) {
    return (
      <div style={box} aria-live="polite">
        <p style={titoloStato}>{T.concluso}</p>
        <p style={nota}>{T.conclusoNota}</p>
      </div>
    );
  }

  // ── In caricamento, o la prima lettura non e riuscita ──
  if (!stato) {
    return (
      <div style={box} aria-live="polite">
        {errore ? (
          <>
            <p style={{ ...nota, marginBottom: 12 }}>{errore}</p>
            <button type="button" className="btn-outline" style={{ padding: "9px 22px" }} onClick={carica}>
              {T.riprova}
            </button>
          </>
        ) : (
          <p style={nota}>{T.caricamento}</p>
        )}
      </div>
    );
  }

  // ── Iscrizioni non ancora attive (prima della migrazione) ──
  if (!stato.disponibile) {
    return (
      <div style={box} aria-live="polite">
        <p style={titoloStato}>{T.nonDisponibile}</p>
        <p style={nota}>{T.nonDisponibileNota}</p>
        {messaggioErrore}
      </div>
    );
  }

  // ── Accesso da fare ──
  if (!stato.autenticato) {
    return (
      <div style={box} aria-live="polite">
        <Link href={loginHref} className="btn-primary" style={pieno}>
          {T.accedi}
        </Link>
        <p style={{ ...nota, margin: "10px 0 0", textAlign: "center" }}>{T.accediNota}</p>
      </div>
    );
  }

  // ── Non partecipa al percorso ──
  if (!stato.idoneo) {
    return (
      <div style={box} aria-live="polite">
        <p style={titoloStato}>{T.nonIdoneo}</p>
        <p style={{ ...nota, marginBottom: 14 }}>{T.nonIdoneoNota}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href={liceiPath} className="btn-outline" style={{ padding: "9px 18px", fontSize: 13 }}>
            {T.percorsoLicei}
          </Link>
          <Link href={universitaPath} className="btn-outline" style={{ padding: "9px 18px", fontSize: 13 }}>
            {T.percorsoUniversita}
          </Link>
        </div>
        {/* Chi era iscritto e non partecipa piu (un'iscrizione rifiutata, un
            percorso chiuso) puo comunque togliere la propria iscrizione. */}
        {stato.iscritto && (
          <div style={{ marginTop: 14 }}>
            <button type="button" style={linkTesto} disabled={occupato} onClick={() => agisci("DELETE")}>
              {T.annulla}
            </button>
          </div>
        )}
        {messaggioErrore}
      </div>
    );
  }

  const conteggioStaff =
    typeof stato.iscritti === "number" ? (
      <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "14px 0 0" }}>
        Staff: {stato.iscritti === 1 ? "1 iscritto" : `${stato.iscritti} iscritti`} finora.
      </p>
    ) : null;

  // ── Iscritto ──
  if (stato.iscritto) {
    return (
      <div style={{ ...box, borderColor: "var(--primary)" }} aria-live="polite">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span
            className="icon-circle icon-circle-primary"
            style={{ width: 36, height: 36, borderRadius: 12 }}
            aria-hidden="true"
          >
            <i className="fas fa-check" />
          </span>
          <p style={{ ...titoloStato, margin: 0 }}>{T.iscritto}</p>
        </div>

        <Calendario googleUrl={stato.calendarioGoogle} icsUrl={icsUrl} conLink={!!stato.link} />

        <div style={{ marginTop: 16 }}>
          {stato.link ? (
            <a
              href={stato.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={pieno}
            >
              <i className="fas fa-video" aria-hidden="true" /> {T.collegati}
            </a>
          ) : (
            <p
              style={{
                ...nota,
                background: "var(--primary-light)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              {T.linkInArrivo}
            </p>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="button" style={linkTesto} disabled={occupato} onClick={() => agisci("DELETE")}>
            {T.annulla}
          </button>
        </div>
        {conteggioStaff}
        {messaggioErrore}
      </div>
    );
  }

  // ── Posti esauriti ──
  if (stato.posti && stato.posti.liberi <= 0) {
    return (
      <div style={box} aria-live="polite">
        <p style={titoloStato}>{T.esauriti}</p>
        <p style={nota}>{T.esauritiNota}</p>
        {conteggioStaff}
      </div>
    );
  }

  // ── Iscrivibile ──
  return (
    <div style={box} aria-live="polite">
      <button
        type="button"
        className="btn-primary"
        style={{ ...pieno, fontFamily: "inherit" }}
        disabled={occupato}
        onClick={() => agisci("POST")}
      >
        {occupato ? "Un momento…" : T.iscriviti}
      </button>
      <p style={{ ...nota, margin: "10px 0 0", textAlign: "center" }}>{T.iscrivitiNota}</p>
      {stato.posti && (
        <p style={{ ...nota, margin: "6px 0 0", textAlign: "center", fontWeight: 600 }}>
          {stato.posti.liberi === 1 ? "Resta 1 posto." : `Restano ${stato.posti.liberi} posti.`}
        </p>
      )}
      <p style={{ ...nota, margin: "6px 0 0", textAlign: "center" }}>{T.calendarioDopo}</p>
      {conteggioStaff}
      {messaggioErrore}
    </div>
  );
}
