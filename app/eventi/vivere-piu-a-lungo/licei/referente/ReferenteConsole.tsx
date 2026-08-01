"use client";

/**
 * Area riservata del docente referente.
 *
 * Fa tre cose, e sono le tre che il bando gli chiede: gli mostra il codice
 * da diffondere, gli fa scaricare il modulo di autorizzazione da far firmare
 * alle famiglie, e gli fa confermare le iscrizioni arrivate. L'elenco
 * confermato, esportabile in CSV, e esattamente l'elenco che l'art. 4 chiede
 * all'istituto di trasmettere: il referente non lo compila, lo approva.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ANNI_CORSO,
  ISCRIZIONE_PATH,
  SITE_URL,
  SQUADRA_MAX,
  SQUADRA_MIN,
  STATI_ISCRIZIONE,
  statoIscrizioneColore,
  statoIscrizioneLabel,
} from "../content";
import { generaAutorizzazionePDF } from "./generaAutorizzazione";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Iscrizione = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Adesione = any;

export function ReferenteConsole() {
  const [adesione, setAdesione] = useState<Adesione | null>(null);
  const [righe, setRighe] = useState<Iscrizione[]>([]);
  const [squadre, setSquadre] = useState<Iscrizione[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/referente", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setAdesione(data.adesione);
      setRighe(data.iscrizioni ?? []);
      setSquadre(data.squadre ?? []);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    setSalvando(id);
    try {
      const res = await fetch("/api/eventi/licei/referente", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setRighe((prev) => prev.map((r) => (r.id === id ? data.iscrizione : r)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const visibili = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return righe;
    return righe.filter((r) =>
      [r.nome, r.cognome, r.classe, r.email].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [righe, filtro]);

  const conteggi = useMemo(() => {
    const c = { attesa: 0, confermate: 0, per_anno: {} as Record<number, number> };
    for (const r of righe) {
      if (r.stato === "in_attesa") c.attesa += 1;
      if (r.stato === "confermata") {
        c.confermate += 1;
        c.per_anno[r.anno_corso] = (c.per_anno[r.anno_corso] ?? 0) + 1;
      }
    }
    return c;
  }, [righe]);

  // Confermati ma senza squadra: e la sola cosa, in questa fase, che nessuno
  // vedrebbe se non la vedesse il referente.
  const senzaSquadra = useMemo(
    () => righe.filter((r) => r.stato === "confermata" && !r.squadra_id).length,
    [righe],
  );

  const linkIscrizione = `${SITE_URL}${ISCRIZIONE_PATH}`;

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  if (errore && !adesione) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Area non disponibile</h2>
        <p className="text-gray-600">{errore}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{adesione?.istituto_denominazione}</h1>
        <p className="text-sm text-gray-600">
          Area del docente referente . {adesione?.referente_nome} {adesione?.referente_cognome}
        </p>
      </div>

      {adesione?.stato === "ricevuta" && (
        <div
          style={{
            background: "#FFF8E6",
            border: "1px solid #F0D89B",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13.5,
            color: "#75570F",
            lineHeight: 1.6,
          }}
        >
          L&apos;adesione del vostro istituto è in verifica. Finché non la confermiamo, il codice non
          accetta iscrizioni: le conviene aspettare la nostra email prima di diffonderlo.
        </div>
      )}

      {/* ── I due strumenti del referente ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Il codice del vostro istituto
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Lo mette in circolare. Gli studenti lo usano per iscriversi da soli.
          </p>
          <div
            style={{
              background: "var(--primary-light)",
              borderRadius: 10,
              padding: "14px 16px",
              textAlign: "center",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
              color: "var(--text-dark)",
              marginBottom: 12,
            }}
          >
            {adesione?.codice}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(
                `Per iscriverti al percorso "Biotecnologie e Intelligenza Artificiale": ${linkIscrizione}\nCodice del nostro istituto: ${adesione?.codice}`,
              );
              setCopiato(true);
              setTimeout(() => setCopiato(false), 2500);
            }}
          >
            {copiato ? "Copiato" : "Copia il testo per la circolare"}
          </Button>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Modulo di autorizzazione
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Già intestato al vostro istituto. Lo stampa, lo fa firmare a un genitore per ogni
            studente minorenne e lo conserva agli atti. Non va inviato a noi.
          </p>
          <Button
            type="button"
            className="w-full"
            onClick={() =>
              adesione &&
              generaAutorizzazionePDF({
                istituto: adesione.istituto_denominazione,
                comune: adesione.istituto_comune,
                provincia: adesione.istituto_provincia,
                referente: `${adesione.referente_nome} ${adesione.referente_cognome}`,
              })
            }
          >
            <i className="fas fa-file-pdf" style={{ marginRight: 8 }} />
            Scarica il modulo
          </Button>
        </div>
      </div>

      {/* ── Conteggi ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{righe.length}</div>
          <div className="stat-label">Iscrizioni ricevute</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "#8A6100" }}>{conteggi.attesa}</div>
          <div className="stat-label">Da confermare</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.confermate}</div>
          <div className="stat-label">Confermate</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.7 }}>
            {ANNI_CORSO.map((a) => (
              <div key={a.anno}>
                {a.label}: <strong>{conteggi.per_anno[a.anno] ?? 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Elenco ── */}
      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <Input
          placeholder="Cerca per cognome, classe o email"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <a
          href="/api/eventi/licei/referente/export"
          className="btn-primary"
          style={{ fontSize: 13, whiteSpace: "nowrap" }}
        >
          <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
          Elenco confermati
        </a>
        <a
          href="/api/eventi/licei/referente/export?tutte=1"
          className="btn-outline"
          style={{ fontSize: 13, whiteSpace: "nowrap" }}
        >
          Tutte
        </a>
      </div>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14 }}>{errore}</p>}

      {visibili.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            {righe.length === 0
              ? "Nessuna iscrizione ancora. Appena diffonde il codice, le trova qui."
              : "Nessuna iscrizione corrisponde alla ricerca."}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {visibili.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                  {r.cognome} {r.nome}
                </div>
                <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Classe {r.classe} . {r.email}
                </div>
              </div>

              <span
                className="badge"
                style={{
                  background: `${statoIscrizioneColore(r.stato)}1A`,
                  color: statoIscrizioneColore(r.stato),
                  flexShrink: 0,
                }}
              >
                {statoIscrizioneLabel(r.stato)}
              </span>

              {r.stato === "in_attesa" ? (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Button
                    type="button"
                    onClick={() => aggiorna(r.id, { stato: "confermata" })}
                    disabled={salvando === r.id}
                    style={{ height: 34, fontSize: 13 }}
                  >
                    È mio studente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => aggiorna(r.id, { stato: "rifiutata" })}
                    disabled={salvando === r.id}
                    style={{ height: 34, fontSize: 13 }}
                  >
                    Non lo riconosco
                  </Button>
                </div>
              ) : (
                <select
                  value={r.stato}
                  onChange={(e) => aggiorna(r.id, { stato: e.target.value })}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    padding: "0 10px",
                    background: "#fff",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {STATI_ISCRIZIONE.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Squadre dell'istituto ──
          Compaiono solo quando ce ne sono: prima della fase delle squadre
          una sezione vuota direbbe al referente che manca qualcosa. */}
      {squadre.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Le squadre del vostro istituto
          </h2>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 14 }}>
            {senzaSquadra > 0
              ? `${senzaSquadra} student${senzaSquadra === 1 ? "e confermato è rimasto" : "i confermati sono rimasti"} senza squadra. Lei è l'unico che può accorgersene in tempo e andare a cercarli.`
              : "Tutti gli studenti confermati sono in una squadra."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {squadre.map((s, i) => {
              const membri = righe.filter((r) => r.squadra_id === s.id);
              const progetto = Array.isArray(s.licei_progetti)
                ? s.licei_progetti[0]
                : s.licei_progetti;
              const consegnato = progetto?.stato === "consegnato";
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div className="font-semibold text-gray-800" style={{ fontSize: 14 }}>
                      {s.nome}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {membri.length} su {SQUADRA_MAX}
                      {membri.length > 0
                        ? ` . ${membri.map((m: Iscrizione) => m.cognome).join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background: consegnato ? "#0A7A661A" : "#8A61001A",
                      color: consegnato ? "#0A7A66" : "#8A6100",
                      flexShrink: 0,
                    }}
                  >
                    {consegnato
                      ? progetto?.finalista
                        ? "Finalista"
                        : "Progetto consegnato"
                      : membri.length < SQUADRA_MIN
                        ? `Serve almeno ${SQUADRA_MIN} componenti`
                        : "Progetto in bozza"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        L&apos;elenco dei confermati è quello che l&apos;art. 4 chiede all&apos;istituto di
        trasmettere: lo scarica da qui invece di compilarlo. Le autorizzazioni firmate restano in
        custodia alla scuola, non vanno caricate su questo sito.
      </p>
    </div>
  );
}
