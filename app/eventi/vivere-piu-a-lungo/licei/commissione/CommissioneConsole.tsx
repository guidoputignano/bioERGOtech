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
 *
 * Dal 26 novembre i progetti sono smistati (`smistamento.ts`): chi vota
 * vede solo i suoi, con il conto e la scadenza in alto, e due bottoni per
 * i casi che lo smistamento non puo sapere: "Conosco questa squadra" e
 * "Ho tempo, me ne dia altri". Sotto ogni criterio, le tre fasce di
 * punteggio, perche giudici diversi usino lo stesso metro.
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
import {
  APERTI_PER_CHIEDERE_ALTRI,
  LIVELLI_CRITERI,
  MINUTI_PER_PROGETTO,
  durata,
  TEMI_PROGETTO,
  TESTI_SMISTAMENTO,
  temaLabel,
} from "../smistamento";

const banner: React.CSSProperties = {
  background: "#FFF8E6",
  border: "1px solid #F0D89B",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "#75570F",
  lineHeight: 1.6,
};

const bannerInfo: React.CSSProperties = {
  ...banner,
  background: "#ECFAF6",
  border: "1px solid #B4E3D8",
  color: "#08594A",
};

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
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [temi, setTemi] = useState<string[]>([]);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/commissione", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
      setTemi(data.commissario?.temi ?? []);
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

  /** Le azioni dello smistamento: temi, conflitto, altri progetti. */
  const azione = async (corpo: Record<string, unknown>, messaggio: string | null) => {
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/commissione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      if (messaggio) setAvviso(messaggio.replace("{n}", String(data.aggiunti ?? "")));
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(false);
    }
  };

  const cambiaTema = async (valore: string) => {
    const prima = temi;
    const dopo = temi.includes(valore) ? temi.filter((t) => t !== valore) : [...temi, valore];
    setTemi(dopo);
    const ok = await azione({ azione: "temi", temi: dopo }, null);
    if (!ok) setTemi(prima);
  };

  const conflitto = async (progettoId: string) => {
    if (!confirm(TESTI_SMISTAMENTO.conflittoConferma)) return;
    const ok = await azione({ azione: "conflitto", progetto_id: progettoId }, "Fatto: il progetto è passato a un collega.");
    if (ok) {
      setAperto(null);
      await carica();
    }
  };

  const chiediAltri = async () => {
    const ok = await azione({ azione: "altri" }, "Le abbiamo affidato {n} progetti in più: li trova in fondo all'elenco.");
    if (ok) await carica();
  };

  const progetti: Qualsiasi[] = useMemo(() => dati?.progetti ?? [], [dati]);
  const faseAperta = dati?.fase === "aperta";
  const puoVotare = dati?.commissario?.diritto_voto;
  const smistamento = dati?.smistamento ?? null;
  const smistati = !!smistamento?.attivo;
  const riserva = !!dati?.commissario?.riserva;

  const conteggi = useMemo(() => {
    let chiuse = 0;
    for (const p of progetti) if (schede[p.id]?.chiusa) chiuse += 1;
    return { chiuse, totali: progetti.length };
  }, [progetti, schede]);
  const aperti = conteggi.totali - conteggi.chiuse;

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

      {puoVotare && !smistati && <div style={bannerInfo}>{riserva ? TESTI_SMISTAMENTO.riserva : TESTI_SMISTAMENTO.primaDelloSmistamento}</div>}

      {/* I temi del giudice: servono allo smistamento, e restano modificabili. */}
      {puoVotare && smistamento?.presente && (
        <div className="card" style={{ padding: 20 }}>
          <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: "0 0 4px" }}>
            I suoi temi
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6, margin: "0 0 12px" }}>
            {TESTI_SMISTAMENTO.temiGiudice}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TEMI_PROGETTO.map((t) => {
              const scelto = temi.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={scelto}
                  disabled={occupato}
                  onClick={() => cambiaTema(t.value)}
                  style={{
                    padding: "7px 13px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    border: `1.5px solid ${scelto ? "var(--primary)" : "var(--border-color)"}`,
                    background: scelto ? "#E6F8F5" : "#fff",
                    color: scelto ? "#0A7A66" : "var(--text-dark)",
                  }}
                >
                  {scelto && <i className="fas fa-check" aria-hidden="true" style={{ marginRight: 6, fontSize: 11 }} />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{conteggi.totali}</div>
          <div className="stat-label">{smistati ? "I suoi progetti" : "Progetti consegnati"}</div>
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
          {smistati ? (
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-dark)" }}>Scadenza</strong>
              <br />
              {smistamento.scadenza}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
              A parità di punteggio decide <strong>{CRITERIO_DIRIMENTE_LICEI}</strong>, come previsto
              dall&apos;art. 7.
            </div>
          )}
        </div>
      </div>

      {/* Quanto manca, in tempo e non solo in numero: dieci progetti
          sembrano tanti, "restano 40 minuti" no. */}
      {smistati && conteggi.totali > 0 && (
        <div className="card-sm" style={{ padding: "14px 16px" }}>
          <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontSize: 13.5, color: "var(--text-dark)", marginBottom: 8 }}>
            <span>
              Ha chiuso <strong>{conteggi.chiuse}</strong> {conteggi.chiuse === 1 ? "progetto" : "progetti"} su{" "}
              {conteggi.totali}
            </span>
            <span style={{ color: "var(--text-mid)" }}>
              {aperti === 0 ? "Finito, grazie!" : `Restano circa ${durata(aperti * MINUTI_PER_PROGETTO)}`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={conteggi.totali}
            aria-valuenow={conteggi.chiuse}
            style={{ height: 8, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}
          >
            <div
              style={{
                width: `${Math.round((conteggi.chiuse / conteggi.totali) * 100)}%`,
                height: "100%",
                background: "var(--primary)",
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        {NOTA_VALUTAZIONE_INDIPENDENTE}
      </p>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}
      {avviso && <div style={bannerInfo}>{avviso}</div>}

      {progetti.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            {smistati
              ? riserva
                ? "Per ora non ha progetti da valutare: se serve, glieli affidiamo e la avvisiamo via email."
                : "Non ha progetti da valutare in questo momento."
              : "Nessun progetto è stato ancora consegnato. Appena le squadre consegnano, li trova qui."}
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
                    {Array.isArray(p.temi) && p.temi.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {p.temi.map((t: string) => (
                          <span
                            key={t}
                            className="badge"
                            style={{
                              background: temi.includes(t) ? "#E6F8F5" : "#F1F5F9",
                              color: temi.includes(t) ? "#0A7A66" : "var(--text-mid)",
                              fontSize: 11.5,
                            }}
                          >
                            {temaLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
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
                              {/* Le tre fasce: lo stesso metro per giudici diversi. */}
                              {LIVELLI_CRITERI[c.campo] && (
                                <ul style={{ fontSize: 11.5, color: "var(--text-mid)", lineHeight: 1.5, margin: "5px 0 0", paddingLeft: 16 }}>
                                  {LIVELLI_CRITERI[c.campo].map((l) => (
                                    <li key={l.da}>
                                      <strong>
                                        {l.da} a {l.a}
                                      </strong>
                                      : {l.testo}
                                    </li>
                                  ))}
                                </ul>
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

                      {smistati && !chiusa && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                          <button
                            type="button"
                            disabled={occupato}
                            onClick={() => conflitto(p.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontSize: 12.5,
                              color: "var(--text-mid)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {TESTI_SMISTAMENTO.conflitto}
                          </button>
                          <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                            : il progetto passa a un collega.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {smistati && faseAperta && !riserva && (
        <div className="card" style={{ padding: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: "0 0 4px" }}>
                Ha finito e ha ancora tempo?
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6, margin: 0 }}>
                {aperti <= APERTI_PER_CHIEDERE_ALTRI ? TESTI_SMISTAMENTO.altriNota : TESTI_SMISTAMENTO.altriNonAncora}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={occupato || aperti > APERTI_PER_CHIEDERE_ALTRI}
              onClick={chiediAltri}
              style={{ height: 38, fontSize: 13 }}
            >
              {TESTI_SMISTAMENTO.altri}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
