"use client";

/**
 * Pannello staff delle adesioni degli istituti.
 *
 * Due cose che il pannello del bando startup non ha, e che qui servono:
 * la ricerca la fa il database e non la memoria (con tutti i licei della
 * provincia scaricare tutto e filtrare in JS non regge), e in cima c'e il
 * comando che apre e chiude la raccolta. Quel comando esiste perche il bando
 * non fissa termini: li comunica il referente del consorzio, e senza questo
 * ogni data richiederebbe un rilascio del sito.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  STATI_ADESIONE,
  statoAdesioneColore,
  statoAdesioneLabel,
} from "../content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Adesione = any;

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: "0 10px",
  background: "#fff",
  color: "var(--text-dark)",
  fontSize: 13,
};

const STATI_RACCOLTA = [
  { value: "termini_non_comunicati", label: "Termini non comunicati (modulo aperto)" },
  { value: "aperte", label: "Aperte con scadenza pubblicata" },
  { value: "chiuse", label: "Chiuse" },
] as const;

function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div style={{ display: "flex", gap: 14, padding: "9px 0", borderTop: "1px solid var(--border-color)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-light)", width: 190, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: "var(--text-dark)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {children}
      </span>
    </div>
  );
}

export function LiceiAdminPanel() {
  const [rows, setRows] = useState<Adesione[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [aperta, setAperta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filtroStato) params.set("stato", filtroStato);
      const res = await fetch(`/api/eventi/licei/admin?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setRows(data.adesioni ?? []);
      const mappa: Record<string, string> = {};
      for (const c of data.config ?? []) mappa[c.chiave] = c.valore ?? "";
      setConfig(mappa);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, [q, filtroStato]);

  useEffect(() => {
    const t = setTimeout(carica, 250);
    return () => clearTimeout(t);
  }, [carica]);

  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    setSalvando(id);
    try {
      const res = await fetch("/api/eventi/licei/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.adesione : r)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const salvaConfig = async (patch: Record<string, string>) => {
    setSalvando("config");
    try {
      const res = await fetch("/api/eventi/licei/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      const mappa: Record<string, string> = {};
      for (const c of data.config ?? []) mappa[c.chiave] = c.valore ?? "";
      setConfig(mappa);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const totali = useMemo(() => {
    let studenti = 0;
    let evento = 0;
    let confermate = 0;
    for (const r of rows) {
      studenti += r.studenti_totale ?? 0;
      evento += r.evento_studenti_stimati ?? 0;
      if (r.stato === "confermata" || r.stato === "attiva") confermate += 1;
    }
    return { studenti, evento, confermate };
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Adesioni degli istituti</h1>
          <p className="text-sm text-gray-600">
            Biotecnologie e Intelligenza Artificiale . evento finale 10 dicembre 2026, PalaMazzola
          </p>
        </div>
        <a href="/api/eventi/licei/admin/export" className="btn-primary" style={{ fontSize: 13 }}>
          <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
          Esporta CSV
        </a>
      </div>

      {/* Stato della raccolta. Il bando non fissa termini: li comunica il
          referente del consorzio, e da qui si pubblicano senza un deploy. */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Stato della raccolta
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Il bando rimanda i termini al referente del consorzio dei licei. Quando arriva la data,
          scrivila qui: compare in cima alla pagina pubblica senza bisogno di un rilascio del sito.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>
            Stato
            <select
              value={config.stato_adesioni ?? "termini_non_comunicati"}
              onChange={(e) => salvaConfig({ stato_adesioni: e.target.value })}
              style={{ ...selectStyle, minWidth: 280 }}
            >
              {STATI_RACCOLTA.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", flex: "1 1 220px" }}>
            Scadenza da mostrare
            <Input
              key={`scad-${config.scadenza_adesioni_label ?? ""}`}
              defaultValue={config.scadenza_adesioni_label ?? ""}
              placeholder="Es. 30 settembre 2026"
              onBlur={(e) => salvaConfig({ scadenza_adesioni_label: e.target.value })}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", flex: "1 1 300px" }}>
            Avviso in cima alla pagina
            <Input
              key={`avv-${config.avviso ?? ""}`}
              defaultValue={config.avviso ?? ""}
              placeholder="Vuoto per non mostrarlo"
              onBlur={(e) => salvaConfig({ avviso: e.target.value })}
            />
          </label>
          {salvando === "config" && (
            <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "18px 0" }} />

        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Iscrizione degli studenti
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Separata dalle adesioni, e parte chiusa di proposito: aprirla prima che i referenti
          abbiano il codice significa una pagina che respinge tutti quelli che ci arrivano. Da
          aprire quando gli istituti confermati sono abbastanza.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>
            Stato
            <select
              value={config.stato_iscrizioni ?? "chiuse"}
              onChange={(e) => salvaConfig({ stato_iscrizioni: e.target.value })}
              style={{ ...selectStyle, minWidth: 200 }}
            >
              <option value="chiuse">Chiuse</option>
              <option value="aperte">Aperte</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", flex: "1 1 240px" }}>
            Scadenza delle iscrizioni
            <Input
              key={`scad-isc-${config.scadenza_iscrizioni_label ?? ""}`}
              defaultValue={config.scadenza_iscrizioni_label ?? ""}
              placeholder="Es. 15 ottobre 2026"
              onBlur={(e) => salvaConfig({ scadenza_iscrizioni_label: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Conteggi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{rows.length}</div>
          <div className="stat-label">Istituti in elenco</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.confermate}</div>
          <div className="stat-label">Confermati</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.studenti}</div>
          <div className="stat-label">Studenti previsti</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.evento}</div>
          <div className="stat-label">Attesi al PalaMazzola</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <Input
          placeholder="Cerca per istituto, meccanografico, comune, referente o codice"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 280px" }}
        />
        <select value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)} style={selectStyle}>
          <option value="">Tutti gli stati</option>
          {STATI_ADESIONE.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={carica}>
          Aggiorna
        </Button>
      </div>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14 }}>{errore}</p>}
      {loading && <p className="text-sm text-gray-600">Caricamento…</p>}
      {!loading && rows.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">Nessuna adesione corrisponde ai filtri.</p>
        </div>
      )}

      {rows.map((r) => {
        const espansa = aperta === r.id;
        return (
          <div key={r.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setAperta(espansa ? null : r.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 20px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                className="icon-circle icon-circle-primary"
                style={{ width: 38, height: 38, flexShrink: 0 }}
              >
                <i className="fas fa-school" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="block font-semibold text-gray-800" style={{ fontSize: 15 }}>
                  {r.istituto_denominazione}
                </span>
                <span className="block text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {r.istituto_comune} ({r.istituto_provincia}) . {r.referente_nome}{" "}
                  {r.referente_cognome} . <span style={{ fontFamily: "monospace" }}>{r.codice}</span>
                </span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)", flexShrink: 0 }}>
                {r.studenti_totale} studenti
              </span>
              <span
                className="badge"
                style={{
                  background: `${statoAdesioneColore(r.stato)}1A`,
                  color: statoAdesioneColore(r.stato),
                  flexShrink: 0,
                }}
              >
                {statoAdesioneLabel(r.stato)}
              </span>
              <i
                className={`fas fa-chevron-${espansa ? "up" : "down"} text-sm`}
                style={{ color: "var(--text-light)", flexShrink: 0 }}
                aria-hidden="true"
              />
            </button>

            {espansa && (
              <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div
                  style={{
                    background: "var(--bg-light)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "flex-end",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>
                    Stato
                    <select
                      value={r.stato}
                      onChange={(e) => aggiorna(r.id, { stato: e.target.value })}
                      style={selectStyle}
                    >
                      {STATI_ADESIONE.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", flex: "1 1 260px" }}>
                    Note interne
                    <Input
                      defaultValue={r.note_staff ?? ""}
                      onBlur={(e) => aggiorna(r.id, { note_staff: e.target.value })}
                    />
                  </label>
                  {salvando === r.id && (
                    <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
                  )}
                </div>

                <div>
                  <Riga label="Codice meccanografico">{r.codice_meccanografico}</Riga>
                  <Riga label="Email istituto">{r.istituto_email}</Riga>
                  <Riga label="Sito">{r.istituto_sito}</Riga>
                  <Riga label="Dirigente">{r.dirigente_nome}</Riga>
                  <Riga label="Referente">
                    {r.referente_nome} {r.referente_cognome}
                    {r.referente_materia ? `, ${r.referente_materia}` : ""} . {r.referente_email} .{" "}
                    {r.referente_telefono}
                  </Riga>
                  <Riga label="Studenti previsti">
                    {`Terze ${r.studenti_terza} . Quarte ${r.studenti_quarta} . Quinte ${r.studenti_quinta} . Totale ${r.studenti_totale}`}
                  </Riga>
                  <Riga label="Classi coinvolte">{r.classi_coinvolte}</Riga>
                  <Riga label="Attesi all'evento">
                    {r.evento_studenti_stimati !== null && r.evento_studenti_stimati !== undefined
                      ? `${r.evento_studenti_stimati} studenti, ${r.evento_docenti_stimati ?? 0} docenti`
                      : ""}
                  </Riga>
                  <Riga label="Note dell'istituto">{r.note}</Riga>
                  <Riga label="Consenso marketing">{r.consenso_marketing ? "Sì" : "No"}</Riga>
                  <Riga label="Inviata il">
                    {new Date(r.created_at).toLocaleString("it-IT")}
                    {r.updated_at && r.updated_at !== r.created_at
                      ? ` . aggiornata il ${new Date(r.updated_at).toLocaleString("it-IT")}`
                      : ""}
                  </Riga>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
