"use client";

/**
 * Pannello staff della fase 3: squadre, classifica, finalisti.
 *
 * Lo staff vede la classifica ma non la fa. I punteggi arrivano dalle schede
 * della Commissione e qui si possono solo leggere: l'unica cosa che si
 * decide da questa schermata e chi sale sul palco, che e una conseguenza
 * della classifica e non un giudizio nuovo.
 *
 * Il bottone che designa i primi dieci non e un automatismo cieco: propone
 * l'esito che discende dai punteggi e lascia correggere a mano, perche fra
 * la classifica e il palco puo esserci una ragione che il database non
 * conosce. Serve a evitare che qualcuno ricopi dieci righe a mano, che e il
 * modo piu facile di sbagliare l'unica cosa che non si puo sbagliare.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AMBITI_PROGETTO,
  LICEI,
  NOTA_ISCRIZIONE_UFFICIO,
  NOTA_PODIO,
  PREMI_LICEI,
  premioPerPosizione,
  SQUADRA_MAX,
  SQUADRA_MIN,
} from "../content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: "0 10px",
  background: "#fff",
  color: "var(--text-dark)",
  fontSize: 13,
};

const APERTO_CHIUSO = [
  { value: "chiuse", label: "Chiusa" },
  { value: "aperte", label: "Aperta" },
] as const;

const APERTA_CHIUSA = [
  { value: "chiusa", label: "Chiusa" },
  { value: "aperta", label: "Aperta" },
] as const;

function Interruttore({
  titolo,
  spiega,
  valore,
  opzioni,
  onChange,
  disabilitato,
}: {
  titolo: string;
  spiega: string;
  valore: string;
  opzioni: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
  disabilitato: boolean;
}) {
  return (
    <div style={{ flex: "1 1 210px", minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 3 }}>
        {titolo}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-light)", lineHeight: 1.5, margin: "0 0 7px" }}>
        {spiega}
      </p>
      <select
        value={valore}
        disabled={disabilitato}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...selectStyle, width: "100%" }}
      >
        {opzioni.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProgettiPanel() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [scadenza, setScadenza] = useState("");
  const [vista, setVista] = useState<"classifica" | "squadre">("classifica");

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const [resProgetti, resConfig] = await Promise.all([
        fetch("/api/eventi/licei/admin/progetti", { cache: "no-store" }),
        fetch("/api/eventi/licei/admin", { cache: "no-store" }),
      ]);
      const dataProgetti = await resProgetti.json();
      if (!resProgetti.ok) throw new Error(dataProgetti.error || "Caricamento non riuscito.");
      setDati(dataProgetti);

      const dataConfig = await resConfig.json();
      if (resConfig.ok) {
        const mappa: Record<string, string> = {};
        for (const c of dataConfig.config ?? []) mappa[c.chiave] = c.valore ?? "";
        setConfig(mappa);
        setScadenza(mappa.scadenza_consegna_label ?? "");
      }
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const salvaConfig = async (patch: Record<string, string>) => {
    setOccupato(true);
    setErrore(null);
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
      setOccupato(false);
    }
  };

  const aggiornaProgetto = async (id: string, patch: Record<string, unknown>) => {
    setOccupato(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/progetti", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setOccupato(false);
    }
  };

  const designaFinalisti = async () => {
    if (
      !confirm(
        `Designa i primi ${LICEI.progettiSulPalco} della classifica come finalisti? I finalisti attuali vengono azzerati e riassegnati in base ai punteggi di adesso. Potrai comunque correggere a mano.`,
      )
    )
      return;
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/progetti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "designa_finalisti" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      setAvviso(
        `Designati ${data.designati} finalisti.` +
          (data.non_valutati > 0
            ? ` ${data.non_valutati} progetti sono rimasti fuori perché nessuna scheda è stata chiusa su di loro.`
            : ""),
      );
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  const iscriviFinalisti = async () => {
    if (
      !confirm(
        "Iscrivi all'evento del 10 dicembre tutti i componenti confermati delle squadre finaliste? Chi risulta già iscritto viene lasciato dov'è.",
      )
    )
      return;
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/finalisti", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      const parti = [
        `${data.iscritti} studenti iscritti all'evento`,
        `${data.gia_iscritti} risultavano già iscritti`,
        `${data.squadre} squadre coinvolte`,
      ];
      setAvviso(
        parti.join(", ") +
          "." +
          (data.saltati?.length ? ` Saltati: ${data.saltati.join("; ")}.` : ""),
      );
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  /**
   * Mette un progetto su una posizione del podio.
   *
   * Se quella posizione era di qualcun altro i due si scambiano, invece di
   * lasciare il precedente senza posizione: durante una premiazione si
   * corregge un ordine, non si toglie qualcuno dall'elenco per sbaglio.
   */
  const assegnaPodio = async (posizione: number, progettoId: string) => {
    const precedente = classifica.find(
      (r: Qualsiasi) => r.posizione === posizione && r.progetto_id !== progettoId,
    );
    const nuovo = classifica.find((r: Qualsiasi) => r.progetto_id === progettoId);
    if (!nuovo) return;

    setOccupato(true);
    setErrore(null);
    try {
      const patch = async (id: string, corpo: Record<string, unknown>) => {
        const res = await fetch("/api/eventi/licei/admin/progetti", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...corpo }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Salvataggio non riuscito.");
      };

      if (precedente) {
        await patch(precedente.progetto_id, { posizione: nuovo.posizione ?? null });
      }
      await patch(progettoId, { finalista: true, posizione });
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setOccupato(false);
    }
  };

  const classifica: Qualsiasi[] = useMemo(() => dati?.classifica ?? [], [dati]);
  const squadre: Qualsiasi[] = dati?.squadre ?? [];
  const stats = dati?.stats ?? null;
  const votanti = dati?.votanti ?? 0;

  const finalisti = useMemo(
    () => classifica.filter((r) => r.finalista).length,
    [classifica],
  );

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Squadre e progetti</h1>
          <p className="text-sm text-gray-600">
            Classifica dell&apos;art. 7 e finalisti dell&apos;art. 6 . {LICEI.progettiSulPalco}{" "}
            progetti sul palco
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/eventi/licei/admin/progetti/export"
            className="btn-primary"
            style={{ fontSize: 13 }}
          >
            <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
            Classifica
          </a>
          <a
            href="/api/eventi/licei/admin/progetti/export?schede=1"
            className="btn-outline"
            style={{ fontSize: 13 }}
          >
            Schede per commissario
          </a>
        </div>
      </div>

      {/* ── Le tre fasi ── */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Le fasi del percorso
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Si aprono in ordine e a mano. Aprire le consegne prima che esistano le squadre, o la
          valutazione prima che esistano i progetti, produce schermate che non hanno niente da
          mostrare a chi le apre.
        </p>
        <div className="flex flex-wrap gap-5">
          <Interruttore
            titolo="Formazione delle squadre"
            spiega="Gli studenti confermati possono creare squadre ed entrarci."
            valore={config.stato_squadre ?? "chiuse"}
            opzioni={APERTO_CHIUSO}
            disabilitato={occupato}
            onChange={(v) => salvaConfig({ stato_squadre: v })}
          />
          <Interruttore
            titolo="Consegna dei progetti"
            spiega="Le squadre scrivono la bozza e la consegnano. Chiudere qui è il termine."
            valore={config.stato_consegne ?? "chiuse"}
            opzioni={APERTO_CHIUSO}
            disabilitato={occupato}
            onChange={(v) => salvaConfig({ stato_consegne: v })}
          />
          <Interruttore
            titolo="Schede della Commissione"
            spiega="I commissari compilano e chiudono le schede. Chiudere qui congela i punteggi."
            valore={config.stato_valutazione ?? "chiusa"}
            opzioni={APERTA_CHIUSA}
            disabilitato={occupato}
            onChange={(v) => salvaConfig({ stato_valutazione: v })}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-end" style={{ marginTop: 16 }}>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-light)",
              flex: "1 1 260px",
            }}
          >
            Termine per la consegna, come compare agli studenti
            <Input
              placeholder="per esempio 15 novembre 2026"
              value={scadenza}
              onChange={(e) => setScadenza(e.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={occupato}
            onClick={() => salvaConfig({ scadenza_consegna_label: scadenza })}
          >
            Salva il termine
          </Button>
        </div>
      </div>

      {/* ── Conteggi ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{stats?.squadre_totali ?? 0}</div>
          <div className="stat-label">Squadre</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{stats?.studenti_in_squadra ?? 0}</div>
          <div className="stat-label">Studenti in squadra</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "#8A6100" }}>
            {stats?.progetti_bozza ?? 0}
          </div>
          <div className="stat-label">Bozze in corso</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{stats?.progetti_consegnati ?? 0}</div>
          <div className="stat-label">Progetti consegnati</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "#0A7A66" }}>{finalisti}</div>
          <div className="stat-label">Finalisti designati</div>
        </div>
      </div>

      {avviso && (
        <div
          style={{
            background: "#ECFAF6",
            border: "1px solid #B4E3D8",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
            color: "#08594A",
            lineHeight: 1.6,
          }}
        >
          {avviso}
        </div>
      )}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ── Finalisti ── */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Finalisti ed evento
        </h2>
        <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
          Prima si designano i finalisti dalla classifica, poi li si iscrive all&apos;evento. Sono
          due comandi separati di proposito: fra il calcolo e l&apos;iscrizione c&apos;è il momento
          in cui si guarda l&apos;elenco e, se serve, lo si corregge a mano. {NOTA_ISCRIZIONE_UFFICIO}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={occupato} onClick={designaFinalisti}>
            Designa i primi {LICEI.progettiSulPalco}
          </Button>
          <Button type="button" disabled={occupato || finalisti === 0} onClick={iscriviFinalisti}>
            Iscrivi i finalisti all&apos;evento
          </Button>
        </div>
      </div>

      {/* ── Podio (art. 6) ──
          Compare solo quando ci sono finalisti: prima non c'e niente da
          premiare, e una scheda vuota suggerirebbe che manchi un passaggio. */}
      {finalisti > 0 && (
        <div className="card" style={{ padding: 18 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Il podio
          </h2>
          <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
            {NOTA_PODIO}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {PREMI_LICEI.map((premio, i) => {
              const vincitore = classifica.find(
                (r: Qualsiasi) => r.finalista && r.posizione === premio.posizione,
              );
              return (
                <div
                  key={premio.posizione}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  <span
                    className="icon-circle icon-circle-primary"
                    style={{ width: 38, height: 38, flexShrink: 0 }}
                  >
                    <i className={`fas ${premio.icona}`} style={{ fontSize: 14 }} />
                  </span>

                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div className="font-semibold text-gray-800" style={{ fontSize: 14 }}>
                      {premio.titolo}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                      {premio.desc} Parte una rappresentanza {premio.rappresentanza}, e con il tetto
                      di {SQUADRA_MAX} la squadra ci va al completo.
                    </div>
                  </div>

                  <select
                    value={vincitore?.progetto_id ?? ""}
                    disabled={occupato}
                    onChange={(e) => e.target.value && assegnaPodio(premio.posizione, e.target.value)}
                    style={{ ...selectStyle, flex: "0 1 260px" }}
                  >
                    <option value="">Non assegnato</option>
                    {classifica
                      .filter((r: Qualsiasi) => r.finalista)
                      .map((r: Qualsiasi) => (
                        <option key={r.progetto_id} value={r.progetto_id}>
                          {r.squadra_nome} . {r.titolo || "(senza titolo)"}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vista ── */}
      <div className="card-sm flex flex-wrap gap-2 items-center" style={{ padding: 12 }}>
        {(["classifica", "squadre"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: vista === v ? "var(--primary-light)" : "transparent",
              color: vista === v ? "var(--text-dark)" : "var(--text-light)",
            }}
          >
            {v === "classifica" ? "Classifica" : `Squadre (${squadre.length})`}
          </button>
        ))}
        <span style={{ fontSize: 12, color: "var(--text-light)", marginLeft: "auto" }}>
          {votanti} commissari con diritto di voto
        </span>
      </div>

      {/* ── Classifica ── */}
      {vista === "classifica" &&
        (classifica.length === 0 ? (
          <div className="card text-center" style={{ padding: 40 }}>
            <p className="text-gray-600 m-0">
              Nessun progetto consegnato. La classifica compare quando le squadre consegnano e la
              Commissione chiude le prime schede.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {classifica.map((r, i) => {
              const ambito = AMBITI_PROGETTO.find((a) => a.value === r.ambito)?.label ?? r.ambito;
              const schedeMancanti = votanti - Number(r.schede ?? 0);
              const premio = premioPerPosizione(r.posizione);
              return (
                <div
                  key={r.progetto_id}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                    background: r.finalista ? "#F4FBF9" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      fontSize: 15,
                      fontWeight: 800,
                      color: i < LICEI.progettiSulPalco ? "#0A7A66" : "var(--text-light)",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>

                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                      {r.titolo || "(senza titolo)"}
                    </div>
                    <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {r.squadra_nome} . {r.istituto} . {r.componenti}{" "}
                      {Number(r.componenti) === 1 ? "componente" : "componenti"}
                      {ambito ? ` . ${ambito}` : ""}
                    </div>
                    {/* Finalista e premiato non sono la stessa cosa: sul palco
                        salgono in dieci, il premio lo prendono in tre. */}
                    {r.finalista && premio && (
                      <span
                        className="badge"
                        style={{
                          background: "#0A7A661A",
                          color: "#0A7A66",
                          marginTop: 5,
                          display: "inline-block",
                        }}
                      >
                        <i className={`fas ${premio.icona}`} style={{ marginRight: 6 }} />
                        {premio.titolo}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 92 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-dark)" }}>
                      {r.media_totale ?? "."}
                    </div>
                    <div style={{ fontSize: 11.5, color: schedeMancanti > 0 ? "#8A6100" : "var(--text-light)" }}>
                      {r.schede} {Number(r.schede) === 1 ? "scheda" : "schede"} su {votanti}
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "var(--text-dark)",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!r.finalista}
                      disabled={occupato}
                      onChange={(e) =>
                        aggiornaProgetto(r.progetto_id, {
                          finalista: e.target.checked,
                          posizione: e.target.checked ? i + 1 : null,
                        })
                      }
                    />
                    Finalista
                  </label>
                </div>
              );
            })}
          </div>
        ))}

      {/* ── Squadre ── */}
      {vista === "squadre" &&
        (squadre.length === 0 ? (
          <div className="card text-center" style={{ padding: 40 }}>
            <p className="text-gray-600 m-0">
              Nessuna squadra. Compaiono qui appena gli studenti iniziano a formarle.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {squadre.map((s, i) => {
              const membri: Qualsiasi[] = s.licei_iscrizioni ?? [];
              const istituto = s.licei_adesioni?.istituto_denominazione ?? "";
              return (
                <div
                  key={s.id}
                  style={{
                    padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                        {s.nome}
                      </div>
                      <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {istituto} . codice {s.codice}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: membri.length >= SQUADRA_MIN ? "#0A7A661A" : "#8A61001A",
                        color: membri.length >= SQUADRA_MIN ? "#0A7A66" : "#8A6100",
                        flexShrink: 0,
                      }}
                    >
                      {membri.length} su {SQUADRA_MAX}
                      {membri.length < SQUADRA_MIN ? " . non può consegnare" : ""}
                    </span>
                  </div>
                  {membri.length > 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--text-light)", marginTop: 6, lineHeight: 1.6 }}>
                      {membri
                        .map(
                          (m: Qualsiasi) =>
                            `${m.cognome} ${m.nome} (${m.classe}${m.squadra_ruolo === "capo" ? ", capitano" : ""})`,
                        )
                        .join(" . ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
