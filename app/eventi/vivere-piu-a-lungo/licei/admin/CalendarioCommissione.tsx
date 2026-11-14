"use client";

/**
 * Il calendario automatico della Commissione, nel pannello dello staff:
 * che cosa parte da solo e quando, che cosa e gia partito e con quale
 * esito, i numeri dello smistamento, e le anteprime di tutte le email.
 *
 * Il lavoro lo fa il cron ogni mattina alle 8. Da qui si puo solo
 * anticipare: "Invia adesso" per l'aggiornamento di lunedi 16, ed "Esegui
 * ora" per un giro del cron, che fa i soli passi gia dovuti (serve se il
 * cron non e partito).
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GIUDICI_PER_PROGETTO, SCHEDE_MINIME } from "../smistamento";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const NOMI_ANTEPRIME: Record<string, string> = {
  aggiornamento_studenti: "16 nov . Aggiornamento agli studenti",
  aggiornamento_scuole: "16 nov . Aggiornamento alle scuole",
  consegna_studente: "23 nov . Promemoria agli studenti",
  consegna_docente: "23 nov . Squadre in bozza, ai docenti",
  consegna_ultimo: "25 nov . Ultimo giorno, agli studenti",
  giudice_smistamento: "26 nov . I progetti, a ogni giudice",
  giudice_riserva: "26 nov . Alla riserva",
  scuola_consegne: "26 nov . Riepilogo alle scuole",
  studente_dopo: "26 nov . Agli studenti che hanno consegnato",
  giudice_meta: "30 nov . A metà strada, ai giudici",
  giudice_tolti: "2 dic . A chi non ha iniziato",
  giudice_nuovi: "2 e 4 dic . A chi riceve progetti",
  giudice_ultimo: "3 dic . Ultimo giorno, ai giudici",
};

const COLORI: Record<string, { bg: string; fg: string; testo: string }> = {
  fatto: { bg: "#0A7A661A", fg: "#0A7A66", testo: "Fatto" },
  in_programma: { bg: "#F1F5F9", fg: "var(--text-mid)", testo: "In programma" },
  in_attesa: { bg: "#8A61001A", fg: "#8A6100", testo: "Da fare" },
  scaduto: { bg: "#B44A5E1A", fg: "#B44A5E", testo: "Non eseguito" },
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });

export function CalendarioCommissione() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [tipo, setTipo] = useState("aggiornamento_studenti");

  const carica = useCallback(async () => {
    try {
      const res = await fetch("/api/eventi/licei/admin/calendario", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const chiama = async (corpo: Record<string, unknown>, conferma: string | null, esito: (d: Qualsiasi) => string) => {
    if (conferma && !confirm(conferma)) return;
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      setAvviso(esito(data));
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  const riassunto = (d: Qualsiasi) => {
    const fatti = (d.esiti ?? []).filter((e: Qualsiasi) => e.stato === "eseguito" || e.stato === "da_rifare");
    if (fatti.length === 0) return "Nessun passo da fare adesso.";
    return fatti.map((e: Qualsiasi) => `${e.id}: ${e.stato === "eseguito" ? "fatto" : "da rifare"}. ${e.dettagli.join(" ")}`).join(" | ");
  };

  if (!dati) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <p className="text-gray-600 m-0" style={{ fontSize: 14 }}>
          {errore ?? "Caricamento del calendario…"}
        </p>
      </div>
    );
  }

  const n = dati.numeri;
  const aggiornamento = (dati.passi ?? []).find((p: Qualsiasi) => p.id === "aggiornamento");

  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 className="font-semibold text-gray-800" style={{ fontSize: 16, margin: "0 0 4px" }}>
        Smistamento e calendario automatico
      </h2>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "0 0 14px" }}>
        Ogni mattina alle 8 il sito fa da solo il passo del giorno. Ogni progetto va a{" "}
        {GIUDICI_PER_PROGETTO} giudici, per tema e con carichi uguali. Ogni passo parte una volta:
        rifarlo non manda email doppie.
      </p>

      {!dati.migrazione && (
        <div style={{ background: "#FFF8E6", border: "1px solid #F0D89B", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#75570F", lineHeight: 1.6, marginBottom: 12 }}>
          Manca la migrazione <code>20261231100000_licei_smistamento.sql</code>: senza, il modulo
          non chiede i temi, l&apos;aggiornamento non parte e lo smistamento non si fa.
        </div>
      )}
      {!dati.cron && (
        <div style={{ background: "#FFF8E6", border: "1px solid #F0D89B", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#75570F", lineHeight: 1.6, marginBottom: 12 }}>
          CRON_SECRET non è impostato su Vercel: il cron non parte da solo. Finché non lo è, usa
          «Esegui ora» ogni mattina.
        </div>
      )}

      {n && (
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 14 }}>
          {[
            [`${n.progetti} progetti consegnati`, n.senza_temi ? `${n.senza_temi} senza temi` : null],
            [`${n.giudici} giudici`, n.giudici_senza_temi ? `${n.giudici_senza_temi} senza temi` : null],
            [`${n.riserva} in riserva`, null],
            [`${n.assegnazioni} assegnazioni`, null],
            [`${n.sotto_giudici} progetti con meno di ${GIUDICI_PER_PROGETTO} giudici`, null],
            [`${n.sotto_schede} con meno di ${SCHEDE_MINIME} schede chiuse`, null],
          ].map(([a, b]) => (
            <span key={a as string} className="badge" style={{ background: "#F1F5F9", color: "var(--text-dark)", fontSize: 12 }}>
              {a}
              {b ? <span style={{ color: "#8A6100", marginLeft: 4 }}>({b})</span> : null}
            </span>
          ))}
        </div>
      )}

      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {(dati.passi ?? []).map((p: Qualsiasi) => {
          const c = COLORI[p.stato] ?? COLORI.in_programma;
          return (
            <li key={p.id} style={{ border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 14px" }}>
              <div className="flex flex-wrap items-center gap-2">
                <strong style={{ fontSize: 13.5, color: "var(--text-dark)" }}>{p.quando}</strong>
                <span style={{ fontSize: 13.5, color: "var(--text-dark)" }}>{p.titolo}</span>
                <span className="badge" style={{ background: c.bg, color: c.fg, fontSize: 11.5, marginLeft: "auto" }}>
                  {p.fatto_at ? `${c.testo} il ${quando(p.fatto_at)}` : c.testo}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6, margin: "4px 0 0" }}>{p.descrizione}</p>
              {p.dettagli?.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, margin: "4px 0 0" }}>{p.dettagli.join(" . ")}</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 14 }}>
        {aggiornamento && aggiornamento.stato !== "fatto" && aggiornamento.stato !== "scaduto" && (
          <Button
            type="button"
            disabled={occupato || !dati.migrazione}
            onClick={() =>
              chiama(
                { azione: "aggiornamento_ora" },
                "Inviare adesso l'aggiornamento a tutti gli studenti e a tutti i docenti? Parte una volta sola.",
                riassunto,
              )
            }
          >
            Invia adesso l&apos;aggiornamento
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={occupato}
          onClick={() => chiama({ azione: "esegui" }, "Eseguire adesso i passi già dovuti e non ancora fatti?", riassunto)}
        >
          Esegui ora i passi dovuti
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          style={{ height: 36, borderRadius: 8, border: "1px solid var(--border-color)", padding: "0 10px", background: "#fff", fontSize: 13, flex: "1 1 280px" }}
          aria-label="Email da vedere"
        >
          {(dati.anteprime ?? []).map((k: string) => (
            <option key={k} value={k}>
              {NOMI_ANTEPRIME[k] ?? k}
            </option>
          ))}
        </select>
        <a
          href={`/api/eventi/licei/admin/calendario?anteprima=${encodeURIComponent(tipo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          Anteprima
        </a>
        <Button
          type="button"
          variant="outline"
          disabled={occupato}
          onClick={() => chiama({ azione: "prova", tipo }, null, (d) => `Prova inviata a ${d.email}.`)}
          style={{ height: 36, fontSize: 13 }}
        >
          Invia una prova a me
        </Button>
      </div>

      {avviso && <p style={{ fontSize: 13, color: "#0A7A66", lineHeight: 1.6, margin: "12px 0 0" }}>{avviso}</p>}
      {errore && <p style={{ fontSize: 13, color: "#E74C6F", lineHeight: 1.6, margin: "12px 0 0" }}>{errore}</p>}
    </div>
  );
}
