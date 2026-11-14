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
  | { stato: "chiuso" | "gia_giudice" | "disattivato" | "da_confermare"; nome: string };

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

  if (stato.stato === "gia_giudice") {
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          {appena ? `Grazie, ${nome}!` : `${nome}, fa già parte della Commissione`}
        </h1>
        <p className="text-gray-600" style={{ lineHeight: 1.7 }}>
          {appena
            ? "Le abbiamo appena mandato un'email per accedere all'area della Commissione. Appena entra, scelga i temi in cui si sente più competente: il 26 novembre riceve i suoi progetti."
            : "Trova i suoi progetti e la scelta dei temi nell'area della Commissione."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={COMMISSIONE_PATH} className="btn-primary">
            Area della Commissione
          </Link>
          <Link href={`${COMMISSIONE_PATH}/${GUIDA_COMMISSIONE_SLUG}`} className="btn-outline">
            La guida per i giudici
          </Link>
        </div>
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
