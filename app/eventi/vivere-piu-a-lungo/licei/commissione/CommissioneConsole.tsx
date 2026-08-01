"use client";

/**
 * Area della Commissione di valutazione (art. 8).
 *
 * Tre scelte che vale la pena spiegare, perche sono tutte contro la
 * comodita:
 *
 * 1. Il commissario vede solo le PROPRIE schede. Il punteggio dei colleghi
 *    non compare da nessuna parte, e non e riservatezza fine a se stessa: un
 *    voto letto prima di dare il proprio lo tira verso di se, e la media di
 *    cinque giudizi ancorati vale meno di cinque giudizi indipendenti.
 *
 * 2. Non ci sono i nomi degli studenti. La Commissione valuta progetti, non
 *    ragazzi: i sei criteri dell'art. 7 si applicano tutti al lavoro, e fra
 *    i commissari ci sono esperti esterni e rappresentanti d'impresa che non
 *    hanno ragione di ricevere l'anagrafica di trenta minorenni.
 *
 * 3. Una scheda entra in classifica solo quando viene chiusa. Una scheda a
 *    meta non e un voto basso, e un voto non ancora dato, e farla pesare
 *    penalizzerebbe un progetto senza che nessuno lo abbia deciso.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AMBITI_PROGETTO,
  CAMPI_PROGETTO,
  CRITERI_LICEI,
  CRITERIO_DIRIMENTE_LICEI,
  LICEI,
  NOTA_CRITERIO_PRESENTAZIONE,
  NOTA_VALUTAZIONE_INDIPENDENTE,
  ruoloCommissioneLabel,
} from "../content";
import { totaleValutazione, type ValutazioneInput } from "@/lib/eventi/licei-squadre";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

export function CommissioneConsole() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [schede, setSchede] = useState<Record<string, ValutazioneInput>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/commissione", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
      const mappa: Record<string, ValutazioneInput> = {};
      for (const v of data.valutazioni ?? []) {
        mappa[v.progetto_id] = {
          p_innovativita: v.p_innovativita,
          p_fattibilita: v.p_fattibilita,
          p_impatto: v.p_impatto,
          p_etica: v.p_etica,
          p_squadra: v.p_squadra,
          p_presentazione: v.p_presentazione,
          nota: v.nota ?? "",
          chiusa: v.chiusa,
        };
      }
      setSchede(mappa);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const salva = async (progettoId: string, chiudi: boolean) => {
    setSalvando(progettoId);
    setErrore(null);
    try {
      const scheda = schede[progettoId] ?? {};
      const res = await fetch("/api/eventi/licei/commissione", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scheda, progetto_id: progettoId, chiusa: chiudi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setSchede((p) => ({ ...p, [progettoId]: { ...p[progettoId], chiusa: chiudi } }));
      setSalvato(progettoId);
      setTimeout(() => setSalvato(null), 2500);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(null);
    }
  };

  const progetti: Qualsiasi[] = useMemo(() => dati?.progetti ?? [], [dati]);
  const faseAperta = dati?.fase === "aperta";
  const puoVotare = dati?.commissario?.diritto_voto;

  const conteggi = useMemo(() => {
    let chiuse = 0;
    for (const p of progetti) if (schede[p.id]?.chiusa) chiuse += 1;
    return { chiuse, totali: progetti.length };
  }, [progetti, schede]);

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  if (errore && !dati) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Area non disponibile</h2>
        <p className="text-gray-600 m-0">{errore}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Commissione di valutazione</h1>
        <p className="text-sm text-gray-600">
          {dati?.commissario?.nome} {dati?.commissario?.cognome}
          {dati?.commissario?.ruolo ? ` . ${ruoloCommissioneLabel(dati.commissario.ruolo)}` : ""}
        </p>
      </div>

      {!puoVotare && (
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
          L&apos;art. 8 le assegna funzioni consultive e senza diritto di voto. Può leggere i
          progetti e lasciare note, che restano agli atti, ma i suoi punteggi non entrano nella
          media della classifica.
        </div>
      )}

      {!faseAperta && (
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
          Le schede non sono aperte in questo momento. Può leggere i progetti, non modificare i
          punteggi.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.totali}</div>
          <div className="stat-label">Progetti consegnati</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.chiuse}</div>
          <div className="stat-label">Schede chiuse</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "#8A6100" }}>
            {conteggi.totali - conteggi.chiuse}
          </div>
          <div className="stat-label">Ancora da valutare</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
            A parità di punteggio decide <strong>{CRITERIO_DIRIMENTE_LICEI}</strong>, come previsto
            dall&apos;art. 7.
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        {NOTA_VALUTAZIONE_INDIPENDENTE}
      </p>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {progetti.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            Nessun progetto è stato ancora consegnato. Appena le squadre consegnano, li trova qui.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {progetti.map((p) => {
            const scheda = schede[p.id] ?? {};
            const totale = totaleValutazione(scheda);
            const chiusa = !!scheda.chiusa;
            const espanso = aperto === p.id;
            const squadra = p.licei_squadre?.nome ?? "";
            const istituto = p.licei_adesioni?.istituto_denominazione ?? "";
            const ambito = AMBITI_PROGETTO.find((a) => a.value === p.ambito)?.label ?? p.ambito;

            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setAperto(espanso ? null : p.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div className="font-semibold text-gray-800" style={{ fontSize: 15 }}>
                      {p.titolo}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 3 }}>
                      {squadra} . {istituto}
                      {ambito ? ` . ${ambito}` : ""}
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: chiusa ? "#0A7A661A" : "#8A61001A",
                      color: chiusa ? "#0A7A66" : "#8A6100",
                      flexShrink: 0,
                    }}
                  >
                    {chiusa ? `Valutato . ${totale}/${LICEI.punteggioMassimo}` : "Da valutare"}
                  </span>

                  <i
                    className={`fas fa-chevron-${espanso ? "up" : "down"}`}
                    style={{ color: "var(--text-light)", fontSize: 13 }}
                  />
                </button>

                {espanso && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border-color)" }}>
                    {/* Il progetto */}
                    <div style={{ paddingTop: 16 }}>
                      {CAMPI_PROGETTO.map((c) => (
                        <div key={c.campo} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", marginBottom: 4 }}>
                            {c.label}
                          </div>
                          <div style={{ fontSize: 13.5, color: "var(--text-dark)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                            {p[c.campo] || "."}
                          </div>
                        </div>
                      ))}
                      {p.link_materiali && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", marginBottom: 4 }}>
                            Materiali
                          </div>
                          <a
                            href={p.link_materiali}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 13.5, color: "#0A7A66", fontWeight: 600, wordBreak: "break-all" }}
                          >
                            {p.link_materiali}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* La scheda */}
                    <div
                      style={{
                        background: "var(--bg-light, #F8FAFB)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        padding: 18,
                        marginTop: 8,
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 14 }}>
                        <h3 className="font-semibold text-gray-800" style={{ fontSize: 14.5, margin: 0 }}>
                          La sua scheda
                        </h3>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#0A7A66" }}>
                          {totale} / {LICEI.punteggioMassimo}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {CRITERI_LICEI.map((c) => (
                          <div key={c.campo} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dark)" }}>
                                {c.criterio}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--text-light)", lineHeight: 1.5 }}>
                                {c.desc}
                              </div>
                              {/* Questo criterio si giudica davvero solo dal
                                  vivo: senza avvisarlo, darebbe un voto
                                  definitivo su una cosa non ancora vista. */}
                              {c.campo === "p_presentazione" && (
                                <div style={{ fontSize: 11.5, color: "#8A6100", lineHeight: 1.5, marginTop: 3 }}>
                                  {NOTA_CRITERIO_PRESENTAZIONE}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <input
                                type="number"
                                min={0}
                                max={c.punti}
                                step={0.5}
                                value={scheda[c.campo] ?? ""}
                                disabled={!faseAperta || chiusa}
                                onChange={(e) =>
                                  setSchede((prev) => ({
                                    ...prev,
                                    [p.id]: {
                                      ...prev[p.id],
                                      [c.campo]: e.target.value === "" ? null : Number(e.target.value),
                                    },
                                  }))
                                }
                                style={{
                                  width: 76,
                                  height: 36,
                                  borderRadius: 8,
                                  border: "1px solid var(--border-color)",
                                  padding: "0 10px",
                                  background: "#fff",
                                  fontSize: 14,
                                  textAlign: "right",
                                }}
                              />
                              <span style={{ fontSize: 12.5, color: "var(--text-light)", width: 42 }}>
                                / {c.punti}
                              </span>
                            </div>
                          </div>
                        ))}

                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dark)", marginBottom: 5 }}>
                            Nota (facoltativa)
                          </div>
                          <textarea
                            rows={3}
                            value={scheda.nota ?? ""}
                            disabled={!faseAperta || chiusa}
                            maxLength={3000}
                            onChange={(e) =>
                              setSchede((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], nota: e.target.value },
                              }))
                            }
                            style={{
                              border: "1px solid var(--border-color)",
                              borderRadius: 8,
                              padding: 10,
                              fontSize: 14,
                              background: "#fff",
                              color: "var(--text-dark)",
                              width: "100%",
                              resize: "vertical",
                              lineHeight: 1.6,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3" style={{ marginTop: 14 }}>
                        {chiusa ? (
                          <>
                            <span style={{ fontSize: 13, color: "#0A7A66", fontWeight: 600, alignSelf: "center" }}>
                              Scheda chiusa.
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!faseAperta || salvando === p.id}
                              onClick={() => salva(p.id, false)}
                              style={{ height: 36, fontSize: 13 }}
                            >
                              Riapri per correggere
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!faseAperta || salvando === p.id}
                              onClick={() => salva(p.id, false)}
                              style={{ height: 36, fontSize: 13 }}
                            >
                              {salvato === p.id ? "Salvato" : "Salva senza chiudere"}
                            </Button>
                            <Button
                              type="button"
                              disabled={!faseAperta || salvando === p.id}
                              onClick={() => salva(p.id, true)}
                              style={{ height: 36, fontSize: 13 }}
                            >
                              Chiudi la scheda
                            </Button>
                          </>
                        )}
                      </div>

                      {!chiusa && (
                        <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, margin: "10px 0 0" }}>
                          La scheda entra in classifica solo quando la chiude, e per chiuderla
                          servono tutti e sei i punteggi. Fino ad allora resta un suo appunto
                          privato.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
