"use client";

/**
 * Il modulo del link di invito per i giudici: nome, email, ruolo e
 * organizzazione. La candidatura arriva allo staff, che la approva o la
 * rifiuta; con l'approvazione parte l'email di accesso.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { COMMISSIONE_PATH, RUOLI_COMMISSIONE } from "../../content";
import {
  GUIDA_COMMISSIONE_SLUG,
  MINUTI_PER_PROGETTO,
  PROGETTI_MAX_PER_GIUDICE,
  SCADENZA_GIUDICI_LABEL,
  VIDEO_GIUDICI_ANCORA,
} from "../../smistamento";

const RUOLI = RUOLI_COMMISSIONE.filter((r) => r.value !== "consorzio");

const etichetta: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: "var(--text-dark)", display: "block", marginBottom: 6 };

export function CandidaturaGiudice() {
  const codice = useSearchParams().get("c") ?? "";
  const [link, setLink] = useState<{ valido: boolean; aperto: boolean } | null>(null);
  const [f, setF] = useState({ nome: "", cognome: "", email: "", ruolo: "esperto", organizzazione: "" });
  const [conflitto, setConflitto] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState<"inviata" | "gia_giudice" | "gia_in_attesa" | null>(null);

  useEffect(() => {
    fetch(`/api/eventi/licei/commissione/candidatura?c=${encodeURIComponent(codice)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLink({ valido: !!d.valido, aperto: !!d.aperto }))
      .catch(() => setLink({ valido: false, aperto: true }));
  }, [codice]);

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setOccupato(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/commissione/candidatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, codice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invio non riuscito.");
      setFatto(data.stato);
      // La conferma e piu corta del modulo: si torna in cima, dove si legge.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setOccupato(false);
    }
  };

  const scheda = (figli: React.ReactNode) => <div className="card" style={{ padding: 28 }}>{figli}</div>;
  const linkGuida = (
    <p className="text-gray-600" style={{ fontSize: 14, lineHeight: 1.7, margin: "16px 0 0" }}>
      Intanto, se vuole:{" "}
      <Link href={`${COMMISSIONE_PATH}/${VIDEO_GIUDICI_ANCORA}`} style={{ color: "#0A7A66", fontWeight: 600 }}>
        il video di due minuti
      </Link>{" "}
      e{" "}
      <Link href={`${COMMISSIONE_PATH}/${GUIDA_COMMISSIONE_SLUG}`} style={{ color: "#0A7A66", fontWeight: 600 }}>
        la guida per i giudici
      </Link>
      .
    </p>
  );

  if (!link) return scheda(<p className="text-gray-600 m-0">Caricamento…</p>);

  if (!link.valido || !link.aperto) {
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">{link.aperto ? "Link non valido" : "Candidature chiuse"}</h1>
        <p className="text-gray-600 m-0" style={{ lineHeight: 1.7 }}>
          {link.aperto
            ? "Il link non è completo o non è più attivo. Chieda un link nuovo alla Fondazione, oppure scriva a info@bioergotech.org."
            : "Le valutazioni sono ormai in corso. Grazie comunque per la disponibilità."}
        </p>
      </>,
    );
  }

  if (fatto) {
    return scheda(
      <>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          {fatto === "inviata" ? "Grazie! Candidatura ricevuta." : fatto === "gia_giudice" ? "Fa già parte della Commissione" : "La sua candidatura è già arrivata"}
        </h1>
        <p className="text-gray-600 m-0" style={{ lineHeight: 1.7 }}>
          {fatto === "gia_giudice"
            ? "Può entrare nell'area della Commissione con la sua email e la sua password."
            : "La Fondazione la conferma a breve. Con la conferma le arriva un'email con l'accesso all'area della Commissione: se non la trova, guardi anche nello spam."}
        </p>
        {fatto === "gia_giudice" ? (
          <Link href={`/auth/login?returnTo=${encodeURIComponent(COMMISSIONE_PATH)}`} className="btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
            Accedi
          </Link>
        ) : (
          linkGuida
        )}
      </>,
    );
  }

  return scheda(
    <form onSubmit={invia}>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Commissione di valutazione: la sua disponibilità</h1>
      <p className="text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 6px" }}>
        La Commissione valuta i progetti delle squadre delle scuole superiori. Le chiediamo:
      </p>
      <ul className="text-gray-600" style={{ lineHeight: 1.7, paddingLeft: 20, margin: "0 0 18px", listStyle: "disc" }}>
        <li>
          circa dieci progetti, mai più di {PROGETTI_MAX_PER_GIUDICE}: circa {MINUTI_PER_PROGETTO}{" "}
          minuti l&apos;uno, meno di due ore in tutto, online;
        </li>
        <li>dal 26 novembre a {SCADENZA_GIUDICI_LABEL}.</li>
      </ul>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
        <div>
          <label htmlFor="nome" style={etichetta}>Nome</label>
          <Input id="nome" required autoComplete="given-name" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </div>
        <div>
          <label htmlFor="cognome" style={etichetta}>Cognome</label>
          <Input id="cognome" required autoComplete="family-name" value={f.cognome} onChange={(e) => setF({ ...f, cognome: e.target.value })} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="email" style={etichetta}>Email</label>
        <Input id="email" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "4px 0 0" }}>
          Se ha già un account sul sito, usi la stessa email: entrerà con le credenziali di sempre.
        </p>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="ruolo" style={etichetta}>Ruolo</label>
        <select
          id="ruolo"
          value={f.ruolo}
          onChange={(e) => setF({ ...f, ruolo: e.target.value })}
          style={{ height: 40, borderRadius: 8, border: "1px solid var(--border-color)", padding: "0 10px", background: "#fff", width: "100%", fontSize: 14 }}
        >
          {RUOLI.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="org" style={etichetta}>Organizzazione (facoltativa)</label>
        <Input id="org" autoComplete="organization" value={f.organizzazione} onChange={(e) => setF({ ...f, organizzazione: e.target.value })} />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--text-dark)", lineHeight: 1.6, marginBottom: 18 }}>
        <input type="checkbox" checked={conflitto} onChange={(e) => setConflitto(e.target.checked)} style={{ marginTop: 4 }} />
        <span>
          Se fra i miei progetti ce n&apos;è uno di una squadra che conosco, non lo valuto: uso «Conosco questa squadra» e
          passa a un collega.
        </span>
      </label>
      <button type="submit" className="btn-primary" disabled={!conflitto || occupato} style={{ fontFamily: "inherit" }}>
        {occupato ? "Un momento…" : "Invia la mia disponibilità"}
      </button>
      <p className="text-gray-600" style={{ fontSize: 13, lineHeight: 1.6, margin: "12px 0 0" }}>
        La Fondazione conferma ogni candidatura. Usiamo nome ed email solo per la Commissione.
      </p>
      {errore && <p style={{ color: "#B44A5E", fontSize: 14, margin: "12px 0 0" }}>{errore}</p>}
    </form>,
  );
}
