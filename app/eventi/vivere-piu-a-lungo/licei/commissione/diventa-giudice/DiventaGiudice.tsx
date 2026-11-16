"use client";

/**
 * Il mentor conferma la disponibilita a fare il giudice. Il link arriva
 * dall'email di invito e porta la firma (`?t=`): niente accesso da fare.
 * Un clic, e il mentor entra in Commissione e riceve l'email per accedere
 * all'area, dove sceglie i temi.
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { COMMISSIONE_PATH } from "../../content";
import { GUIDA_COMMISSIONE_SLUG, MINUTI_PER_PROGETTO, PROGETTI_MAX_PER_GIUDICE, SCADENZA_GIUDICI_LABEL } from "../../smistamento";

type Stato =
  | { stato: "non_valido" }
  | { stato: "chiuso" | "gia_giudice" | "disattivato" | "da_confermare"; nome: string }
  | { stato: "entrato"; nome: string; emailInviata: boolean; loginEmail: string; giaEntrato: boolean };

const LOGIN_HREF = `/auth/login?returnTo=${encodeURIComponent(COMMISSIONE_PATH)}`;

/**
 * Come si entra. Chi ha gia usato il sito accede e basta, con le
 * credenziali di sempre; chi non e mai entrato ha il link per la password
 * nell'email. In tutti e due i casi "Accedi" e il primo pulsante.
 */
function ComeSiEntra({ loginEmail, giaEntrato }: { loginEmail?: string; giaEntrato?: boolean }) {
  const indirizzo = loginEmail ? <strong>{loginEmail}</strong> : "la sua email";
  return (
    <div style={{ background: "#ECFAF6", border: "1px solid #B4E3D8", borderRadius: 10, padding: "14px 16px", margin: "0 0 18px" }}>
      <p style={{ fontSize: 14, color: "#08594A", lineHeight: 1.7, margin: "0 0 10px" }}>
        {giaEntrato === false ? (
          <>
            <strong>Per entrare:</strong> scelga la password dal link che le abbiamo mandato via email, poi acceda con{" "}
            {indirizzo}.
          </>
        ) : (
          <>
            <strong>Per entrare</strong> basta accedere con le credenziali che usa già sul sito: {indirizzo} e la sua
            password.
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={LOGIN_HREF} className="btn-primary">
          Accedi
        </Link>
        <Link href="/auth/forgot-password" style={{ fontSize: 13.5, color: "var(--text-mid)", textDecoration: "underline" }}>
          {giaEntrato === false ? "Il link è scaduto o non è arrivato?" : "Non ricorda la password?"}
        </Link>
      </div>
    </div>
  );
}

export function DiventaGiudice() {
  const t = useSearchParams().get("t") ?? "";
  const [stato, setStato] = useState<Stato | null>(null);
  const [appena, setAppena] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [presaVisione, setPresaVisione] = useState(false);

  const carica = useCallback(async () => {
    try {
      const res = await fetch(`/api/eventi/licei/commissione/mentor?t=${encodeURIComponent(t)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setStato(data);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    }
  }, [t]);

  useEffect(() => {
    carica();
  }, [carica]);

  const conferma = async () => {
    setOccupato(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/commissione/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adesione non riuscita.");
      setStato(data);
      setAppena(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Adesione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  const scheda = (figli: React.ReactNode) => (
    <div className="card" style={{ padding: 28 }}>
      {figli}
    </div>
  );

  if (!stato) return scheda(<p className="text-gray-600 m-0">{errore ?? "Caricamento…"}</p>);

  if (stato.stato === "non_valido") {
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Link non valido</h1>
        <p className="text-gray-600 m-0">
          Il link non è completo o non è più valido. Usi il pulsante dell&apos;email che ha ricevuto, oppure ci
          scriva a info@bioergotech.org.
        </p>
      </>,
    );
  }

  const nome = stato.nome;

  if (stato.stato === "entrato" || stato.stato === "gia_giudice") {
    const entrato = stato.stato === "entrato" ? stato : null;
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          {appena ? `Grazie, ${nome}! Ora fa parte della Commissione.` : `${nome}, fa già parte della Commissione`}
        </h1>
        <p className="text-gray-600" style={{ lineHeight: 1.7 }}>
          {entrato
            ? "Appena entra, scelga i temi in cui si sente più competente: il 26 novembre riceve i suoi progetti."
            : "Trova i suoi progetti e la scelta dei temi nell'area della Commissione."}
          {entrato && !entrato.giaEntrato && !entrato.emailInviata
            ? " L'email con il link per la password non è partita: usi «Il link è scaduto o non è arrivato?» qui sotto."
            : ""}
        </p>
        <ComeSiEntra loginEmail={entrato?.loginEmail} giaEntrato={entrato ? entrato.giaEntrato : undefined} />
        <Link href={`${COMMISSIONE_PATH}/${GUIDA_COMMISSIONE_SLUG}`} style={{ fontSize: 14, fontWeight: 600, color: "#0A7A66" }}>
          La guida per i giudici
        </Link>
      </>,
    );
  }

  if (stato.stato === "disattivato" || stato.stato === "chiuso") {
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Grazie, {nome}</h1>
        <p className="text-gray-600 m-0" style={{ lineHeight: 1.7 }}>
          {stato.stato === "chiuso"
            ? "Le adesioni alla Commissione sono chiuse: le valutazioni sono ormai in corso. Grazie comunque per la disponibilità."
            : "Per tornare in Commissione ci scriva a info@bioergotech.org."}
        </p>
      </>,
    );
  }

  return scheda(
    <>
      <h1 className="text-xl font-bold text-gray-800 mb-2">{nome}, vuole fare il giudice?</h1>
      <p className="text-gray-600" style={{ lineHeight: 1.7 }}>
        Entrare nella Commissione che valuta i progetti delle scuole superiori vuol dire:
      </p>
      <ul className="text-gray-600" style={{ lineHeight: 1.7, paddingLeft: 20, margin: "0 0 16px", listStyle: "disc" }}>
        <li>
          circa dieci progetti, mai più di {PROGETTI_MAX_PER_GIUDICE}: circa {MINUTI_PER_PROGETTO}{" "}
          minuti l&apos;uno, meno di due ore in tutto, online, anche in due sedute;
        </li>
        <li>dal 26 novembre a {SCADENZA_GIUDICI_LABEL};</li>
        <li>progetti scelti soprattutto fra i temi che indica lei;</li>
        <li>ogni progetto è letto anche da un altro giudice: il suo è uno dei due pareri.</li>
      </ul>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--text-dark)", lineHeight: 1.6, marginBottom: 18 }}>
        <input type="checkbox" checked={presaVisione} onChange={(e) => setPresaVisione(e.target.checked)} style={{ marginTop: 4 }} />
        <span>
          Se fra i miei progetti ce n&apos;è uno di una squadra che ho seguito come mentor, non lo valuto: uso «Conosco
          questa squadra» e passa a un collega.
        </span>
      </label>
      <button type="button" className="btn-primary" disabled={!presaVisione || occupato} onClick={conferma} style={{ fontFamily: "inherit" }}>
        {occupato ? "Un momento…" : "Sì, partecipo come giudice"}
      </button>
      <p className="text-gray-600" style={{ fontSize: 13, lineHeight: 1.6, margin: "14px 0 0" }}>
        Se non riesce, non deve fare nulla: il suo aiuto come mentor resta prezioso.
      </p>
      {errore && <p style={{ color: "#B44A5E", fontSize: 14, margin: "12px 0 0" }}>{errore}</p>}
    </>,
  );
}
