"use client";

/**
 * Pannello dell'istruttoria del bando. Elenco delle candidature con filtri,
 * scheda di dettaglio con tutti i campi e gli allegati, e i tre comandi che
 * servono alla Commissione: stato, punteggio e note. Il quarto comando e la
 * riassegnazione di categoria prevista dall'art. 2.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CATEGORIE_BANDO,
  OBIETTIVI_CATEGORIA_C,
  PUNTEGGIO_MASSIMO,
  STADI_CATEGORIA_A,
  STATI_CANDIDATURA,
  STRUMENTI_RACCOLTA,
  ambitoLabel,
  statoColore,
  statoLabel,
} from "../content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Candidatura = any;

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: "0 10px",
  background: "#fff",
  color: "var(--text-dark)",
  fontSize: 13,
};

const etichetta = (lista: readonly { value: string; label: string }[], v: string) =>
  lista.find((x) => x.value === v)?.label ?? v;

const euro = (v: unknown) =>
  v === null || v === undefined || v === "" ? "." : `${Number(v).toLocaleString("it-IT")} euro`;

const dataIt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : ".";

function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div style={{ display: "flex", gap: 14, padding: "9px 0", borderTop: "1px solid var(--border-color)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-light)", width: 170, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: "var(--text-dark)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
        {children}
      </span>
    </div>
  );
}

function Allegato({ file, titolo }: { file: { path: string; nome: string } | null; titolo: string }) {
  if (!file?.path) return null;
  return (
    <a
      href={`/api/eventi/bando/admin/file?path=${encodeURIComponent(file.path)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 12px",
        borderRadius: 8,
        background: "var(--primary-light)",
        color: "var(--text-dark)",
        fontSize: 13,
        textDecoration: "none",
      }}
    >
      <i className="fas fa-file-pdf" style={{ color: "var(--primary-dark)" }} aria-hidden="true" />
      <span style={{ fontWeight: 600 }}>{titolo}</span>
      <span style={{ color: "var(--text-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {file.nome}
      </span>
      <i className="fas fa-arrow-down ml-auto" style={{ color: "var(--primary-dark)", fontSize: 11 }} aria-hidden="true" />
    </a>
  );
}

export function BandoAdminPanel() {
  const [rows, setRows] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [aperta, setAperta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filtroCategoria) params.set("categoria", filtroCategoria);
      if (filtroStato) params.set("stato", filtroStato);
      const res = await fetch(`/api/eventi/bando/admin?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setRows(data.applications ?? []);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, [q, filtroCategoria, filtroStato]);

  useEffect(() => {
    const t = setTimeout(carica, 250);
    return () => clearTimeout(t);
  }, [carica]);

  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    setSalvando(id);
    try {
      const res = await fetch("/api/eventi/bando/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.application : r)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const conteggi = useMemo(() => {
    const perCategoria: Record<string, number> = { A: 0, B: 0, C: 0 };
    let ammesse = 0;
    for (const r of rows) {
      const cat = r.categoria_riassegnata ?? r.categoria;
      if (perCategoria[cat] !== undefined) perCategoria[cat] += 1;
      if (r.stato === "ammessa") ammesse += 1;
    }
    return { perCategoria, ammesse };
  }, [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Testata */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Candidature al bando</h1>
          <p className="text-sm text-gray-600">Showcase di Innovazione . 11 dicembre 2026, Teatro Fusco</p>
        </div>
        <a href="/api/eventi/bando/admin/export" className="btn-primary" style={{ fontSize: 13 }}>
          <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
          Esporta CSV
        </a>
      </div>

      {/* Conteggi */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{rows.length}</div>
          <div className="stat-label">In elenco</div>
        </div>
        {CATEGORIE_BANDO.map((c) => (
          <div key={c.id} className="card-sm" style={{ padding: 16 }}>
            <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.perCategoria[c.id]}</div>
            <div className="stat-label">Categoria {c.id}</div>
          </div>
        ))}
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.ammesse}</div>
          <div className="stat-label">Ammesse</div>
        </div>
      </div>

      {/* Filtri */}
      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <Input
          placeholder="Cerca per progetto, società, referente o codice"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 260px" }}
        />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={selectStyle}>
          <option value="">Tutte le categorie</option>
          {CATEGORIE_BANDO.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} . {c.stadio}
            </option>
          ))}
        </select>
        <select value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)} style={selectStyle}>
          <option value="">Tutti gli stati</option>
          {STATI_CANDIDATURA.map((s) => (
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
          <p className="text-gray-600 m-0">Nessuna candidatura corrisponde ai filtri.</p>
        </div>
      )}

      {/* Elenco */}
      {rows.map((r) => {
        const cat = r.categoria_riassegnata ?? r.categoria;
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
                style={{ width: 38, height: 38, fontWeight: 800, fontSize: 15, flexShrink: 0 }}
              >
                {cat}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="block font-semibold text-gray-800" style={{ fontSize: 15 }}>
                  {r.progetto_nome}
                  {r.categoria_riassegnata && (
                    <span style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 500, marginLeft: 8 }}>
                      riassegnata da {r.categoria}
                    </span>
                  )}
                </span>
                <span className="block text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {r.organizzazione || `${r.referente_nome} ${r.referente_cognome}`} . {r.citta}, {r.paese} .{" "}
                  <span style={{ fontFamily: "monospace" }}>{r.codice}</span>
                </span>
              </span>
              {r.categoria_avvisi?.length > 0 && (
                <i
                  className="fas fa-triangle-exclamation"
                  style={{ color: "#B7791F", flexShrink: 0 }}
                  title={r.categoria_avvisi.join(" ")}
                />
              )}
              {r.punteggio !== null && r.punteggio !== undefined && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)", flexShrink: 0 }}>
                  {r.punteggio}/{PUNTEGGIO_MASSIMO}
                </span>
              )}
              <span
                className="badge"
                style={{ background: `${statoColore(r.stato)}1A`, color: statoColore(r.stato), flexShrink: 0 }}
              >
                {statoLabel(r.stato)}
              </span>
              <i
                className={`fas fa-chevron-${espansa ? "up" : "down"} text-sm`}
                style={{ color: "var(--text-light)", flexShrink: 0 }}
                aria-hidden="true"
              />
            </button>

            {espansa && (
              <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                {r.categoria_avvisi?.length > 0 && (
                  <div
                    style={{
                      background: "#FFF8E6",
                      border: "1px solid #F0D89B",
                      borderRadius: 8,
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#8A6100",
                    }}
                  >
                    <strong>Da verificare.</strong> {r.categoria_avvisi.join(" ")}
                  </div>
                )}

                {/* Istruttoria */}
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
                      {STATI_CANDIDATURA.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>
                    Punteggio su {PUNTEGGIO_MASSIMO}
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      defaultValue={r.punteggio ?? ""}
                      onBlur={(e) =>
                        aggiorna(r.id, { punteggio: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      style={{ width: 110 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)" }}>
                    Riassegna categoria
                    <select
                      value={r.categoria_riassegnata ?? ""}
                      onChange={(e) => aggiorna(r.id, { categoria_riassegnata: e.target.value || null })}
                      style={selectStyle}
                    >
                      <option value="">Nessuna riassegnazione</option>
                      {CATEGORIE_BANDO.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id} . {c.stadio}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", flex: "1 1 240px" }}>
                    Note della Commissione
                    <Input
                      defaultValue={r.note_commissione ?? ""}
                      onBlur={(e) => aggiorna(r.id, { note_commissione: e.target.value })}
                    />
                  </label>
                  {salvando === r.id && (
                    <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
                  )}
                </div>

                {/* Allegati */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Allegato file={r.file_descrizione} titolo="Descrizione del progetto" />
                  <Allegato file={r.file_pitch_deck} titolo="Pitch deck" />
                  <Allegato file={r.file_documentazione} titolo="Documentazione societaria" />
                  <Allegato file={r.file_prospetto} titolo="Prospetto della raccolta" />
                  {(r.file_extra ?? []).map((f: { path: string; nome: string }) => (
                    <Allegato key={f.path} file={f} titolo="Materiale facoltativo" />
                  ))}
                </div>

                {/* Dati */}
                <div>
                  <Riga label="Sintesi">{r.progetto_sintesi}</Riga>
                  <Riga label="Ambiti">{(r.ambiti ?? []).map(ambitoLabel).join(", ")}</Riga>
                  <Riga label="Referente">
                    {r.referente_nome} {r.referente_cognome}
                    {r.referente_ruolo ? `, ${r.referente_ruolo}` : ""} . {r.referente_email} .{" "}
                    {r.referente_telefono}
                  </Riga>
                  <Riga label="Team">
                    {r.team_dimensione ? `${r.team_dimensione} componenti. ` : ""}
                    {r.team_descrizione}
                  </Riga>
                  {r.organizzazione && (
                    <Riga label="Società">
                      {r.organizzazione}
                      {r.forma_giuridica ? `, ${r.forma_giuridica}` : ""}
                      {r.partita_iva ? ` . P.IVA ${r.partita_iva}` : ""}
                      {r.data_costituzione ? ` . costituita il ${dataIt(r.data_costituzione)}` : ""}
                    </Riga>
                  )}
                  <Riga label="Sito web">{r.sito_web}</Riga>
                  <Riga label="Problema">{r.problema}</Riga>
                  <Riga label="Soluzione">{r.soluzione}</Riga>
                  <Riga label="Stato di avanzamento">{r.stato_avanzamento}</Riga>
                  <Riga label="Impatto atteso">{r.impatto_atteso}</Riga>
                  <Riga label="Aspetti etici">{r.aspetti_etici}</Riga>

                  {r.categoria === "A" && (
                    <>
                      <Riga label="Stadio">{r.a_stadio ? etichetta(STADI_CATEGORIA_A, r.a_stadio) : ""}</Riga>
                      <Riga label="Ente di ricerca">{r.a_ente_ricerca}</Riga>
                    </>
                  )}
                  {r.categoria === "B" && (
                    <>
                      <Riga label="Prototipo o MVP">{r.b_stato_prototipo}</Riga>
                      <Riga label="Validazione">{r.b_validazione}</Riga>
                      <Riga label="Modello di business">{r.b_modello_business}</Riga>
                      <Riga label="Raccolta complessiva">{euro(r.b_raccolta_totale_eur)}</Riga>
                    </>
                  )}
                  {r.categoria === "C" && (
                    <>
                      <Riga label="Raccolta complessiva">{euro(r.c_raccolta_totale_eur)}</Riga>
                      <Riga label="Ricavi ultimo esercizio">{euro(r.c_ricavi_ultimo_anno_eur)}</Riga>
                      <Riga label="Strumenti">
                        {(r.c_strumenti ?? []).map((s: string) => etichetta(STRUMENTI_RACCOLTA, s)).join(", ")}
                      </Riga>
                      <Riga label="Sintesi della raccolta">{r.c_round}</Riga>
                      <Riga label="Trazione">{r.c_trazione}</Riga>
                      <Riga label="Cerca">
                        {(r.c_obiettivi ?? []).map((o: string) => etichetta(OBIETTIVI_CATEGORIA_C, o)).join(", ")}
                      </Riga>
                    </>
                  )}

                  <Riga label="Video">{r.video_url}</Riga>
                  <Riga label="Pubblicazioni">{r.pubblicazioni}</Riga>
                  <Riga label="Brevetti">{r.brevetti}</Riga>
                  <Riga label="Presenza a Taranto">{r.presenza_taranto ? "Confermata" : "NON confermata"}</Riga>
                  <Riga label="Edizioni precedenti">
                    {r.edizioni_precedenti ? r.edizioni_avanzamenti || "Sì, senza dettagli" : "No"}
                  </Riga>
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
