"use client";

/**
 * Area dello studente confermato.
 *
 * Fa due cose, nell'ordine in cui servono: la squadra e il progetto. Prima
 * la squadra, perche senza non c'e dove scrivere il progetto, e la pagina lo
 * dice invece di mostrare un modulo che non si puo salvare.
 *
 * Il modulo di consegna non e un questionario: e la griglia dell'art. 7
 * girata in domande, e sopra ogni campo c'e scritto quale criterio alimenta.
 * Uno studente che sa che gli aspetti etici valgono 15 punti su 100 li
 * scrive; uno che non lo sa li salta e perde quei punti senza capire perche.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AMBITI_PROGETTO,
  CAMPI_PROGETTO,
  CRITERI_LICEI,
  LICEI,
  NOTA_CONSEGNA,
  NOTA_MATERIALI,
  SQUADRA_MAX,
  SQUADRA_MIN,
  SQUADRA_NOME_MAX,
  TITOLO_MAX,
  statoProgettoColore,
  statoProgettoLabel,
} from "../content";
import { completezzaProgetto, type ProgettoInput } from "@/lib/eventi/licei-squadre";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const boxStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  background: "#fff",
  color: "var(--text-dark)",
  width: "100%",
};

const VUOTO: ProgettoInput = {
  titolo: "",
  ambito: "",
  problema: "",
  soluzione: "",
  tecnologie: "",
  impatto: "",
  etica: "",
  metodo: "",
  link_materiali: "",
};

export function StudenteConsole() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);

  const [nomeSquadra, setNomeSquadra] = useState("");
  const [codiceEntra, setCodiceEntra] = useState("");
  const [copiato, setCopiato] = useState(false);
  const [bozza, setBozza] = useState<ProgettoInput>(VUOTO);
  const [salvato, setSalvato] = useState(false);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/squadre", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
      if (data.progetto) {
        setBozza({ ...VUOTO, ...data.progetto, link_materiali: data.progetto.link_materiali ?? "" });
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

  const chiama = async (url: string, method: string, body?: unknown) => {
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(false);
    }
  };

  const squadra = dati?.squadra ?? null;
  const membri: Qualsiasi[] = dati?.membri ?? [];
  const progetto = dati?.progetto ?? null;
  const sonoCapo = dati?.iscrizione?.squadra_ruolo === "capo";
  const consegnato = progetto?.stato === "consegnato";
  const consegneAperte = dati?.fasi?.consegne === "aperte";
  const squadreAperte = dati?.fasi?.squadre === "aperte";

  const avanzamento = useMemo(() => completezzaProgetto(bozza), [bozza]);

  /* ── Squadra ── */

  const creaSquadra = async () => {
    const data = await chiama("/api/eventi/licei/squadre", "POST", { nome: nomeSquadra });
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, ...data, iscrizione: { ...p.iscrizione, squadra_id: data.squadra.id, squadra_ruolo: "capo" } }));
      if (data.progetto) setBozza({ ...VUOTO, ...data.progetto });
      setNomeSquadra("");
    }
  };

  const entraSquadra = async () => {
    const data = await chiama("/api/eventi/licei/squadre", "PATCH", {
      azione: "entra",
      codice: codiceEntra,
    });
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, ...data, iscrizione: { ...p.iscrizione, squadra_id: data.squadra.id, squadra_ruolo: "membro" } }));
      if (data.progetto) setBozza({ ...VUOTO, ...data.progetto, link_materiali: data.progetto.link_materiali ?? "" });
      setCodiceEntra("");
    }
  };

  const esciSquadra = async () => {
    if (!confirm("Esci dalla squadra? Se sei l'ultimo componente, la squadra e la bozza del progetto vengono eliminate.")) return;
    const data = await chiama("/api/eventi/licei/squadre", "PATCH", { azione: "esci" });
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, squadra: null, membri: [], progetto: null, iscrizione: { ...p.iscrizione, squadra_id: null, squadra_ruolo: null } }));
      setBozza(VUOTO);
    }
  };

  /* ── Progetto ── */

  const salvaBozza = async () => {
    const data = await chiama("/api/eventi/licei/progetto", "PATCH", bozza);
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, progetto: data.progetto }));
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    }
  };

  const consegna = async () => {
    if (
      !confirm(
        "Consegnate il progetto? Da questo momento non sarà più modificabile, ed è la versione che la Commissione leggerà.",
      )
    )
      return;
    // Si salva prima, cosi la consegna vale su quello che si vede a schermo.
    const salvataggio = await chiama("/api/eventi/licei/progetto", "PATCH", bozza);
    if (!salvataggio) return;
    const data = await chiama("/api/eventi/licei/progetto", "POST", {});
    if (data) {
      setDati((p: Qualsiasi) => ({ ...p, progetto: data.progetto }));
      setAvviso("Progetto consegnato. Avete ricevuto la ricevuta via email, tutti quanti.");
    }
  };

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  if (errore && !dati) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Area non disponibile</h2>
        <p className="text-gray-600 mb-5">{errore}</p>
        <Link href={LICEI.titolo ? "/eventi/vivere-piu-a-lungo/licei" : "#"} className="btn-outline inline-block">
          Torna al bando
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Ciao {dati?.iscrizione?.nome}
        </h1>
        <p className="text-sm text-gray-600">
          {dati?.istituto} . classe {dati?.iscrizione?.classe}
        </p>
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
          }}
        >
          {avviso}
        </div>
      )}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ══ Senza squadra ══ */}
      {!squadra && (
        <>
          <div className="card" style={{ padding: 22 }}>
            <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 16 }}>
              Prima la squadra
            </h2>
            <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
              Il progetto si sviluppa in squadra, da {SQUADRA_MIN} a {SQUADRA_MAX} studenti della
              tua stessa scuola. Uno di voi la crea e passa agli altri il codice che compare qui.
              Cinque è il massimo perché è la rappresentanza che parte per il premio: così la
              squadra che vince ci va al completo.
            </p>
          </div>

          {!squadreAperte && (
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
              La formazione delle squadre non è ancora aperta. Te lo diciamo dentro il corso quando
              lo sarà, non serve che torni a controllare.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card" style={{ padding: 20 }}>
              <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                Crea una squadra
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Diventi il capitano: sarai tu a consegnare il progetto quando siete pronti.
              </p>
              <Input
                placeholder="Nome della squadra"
                value={nomeSquadra}
                maxLength={SQUADRA_NOME_MAX}
                onChange={(e) => setNomeSquadra(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <Button
                type="button"
                className="w-full"
                disabled={occupato || !squadreAperte || !nomeSquadra.trim()}
                onClick={creaSquadra}
              >
                Crea la squadra
              </Button>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
                Entra in una squadra
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Con il codice che ti ha dato chi l&apos;ha creata. È nel formato SQ- più sei
                caratteri.
              </p>
              <Input
                placeholder="SQ-XXXXXX"
                value={codiceEntra}
                onChange={(e) => setCodiceEntra(e.target.value.toUpperCase())}
                style={{ marginBottom: 10, fontFamily: "monospace", letterSpacing: "0.08em" }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={occupato || !squadreAperte || !codiceEntra.trim()}
                onClick={entraSquadra}
              >
                Entra
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ══ Con squadra ══ */}
      {squadra && (
        <>
          <div className="card" style={{ padding: 22 }}>
            <div className="flex flex-wrap items-start justify-between gap-4" style={{ marginBottom: 16 }}>
              <div>
                <h2 className="font-bold text-gray-800" style={{ fontSize: 18, margin: 0 }}>
                  {squadra.nome}
                </h2>
                <p className="text-sm text-gray-600" style={{ margin: "3px 0 0" }}>
                  {membri.length} {membri.length === 1 ? "componente" : "componenti"} su {SQUADRA_MAX}
                  {membri.length < SQUADRA_MIN && ` . ne serve almeno ${SQUADRA_MIN} per consegnare`}
                </p>
              </div>
              {progetto && (
                <span
                  className="badge"
                  style={{
                    background: `${statoProgettoColore(progetto.stato)}1A`,
                    color: statoProgettoColore(progetto.stato),
                  }}
                >
                  {statoProgettoLabel(progetto.stato)}
                </span>
              )}
            </div>

            {!consegnato && (
              <div
                style={{
                  background: "var(--primary-light)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-mid)", marginBottom: 6 }}>
                  Codice per far entrare i compagni
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.12em", fontFamily: "monospace", color: "var(--text-dark)", marginBottom: 10 }}>
                  {squadra.codice}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  style={{ height: 34, fontSize: 13 }}
                  onClick={() => {
                    navigator.clipboard.writeText(squadra.codice);
                    setCopiato(true);
                    setTimeout(() => setCopiato(false), 2500);
                  }}
                >
                  {copiato ? "Copiato" : "Copia il codice"}
                </Button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {membri.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: 14,
                  }}
                >
                  <span className="text-gray-800" style={{ fontWeight: 600 }}>
                    {m.cognome} {m.nome}
                  </span>
                  <span className="text-gray-600" style={{ fontSize: 12.5 }}>
                    classe {m.classe}
                  </span>
                  {m.squadra_ruolo === "capo" && (
                    <span className="badge" style={{ background: "#0A7A661A", color: "#0A7A66", fontSize: 11 }}>
                      capitano
                    </span>
                  )}
                </div>
              ))}
            </div>

            {!consegnato && (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={esciSquadra}
                  disabled={occupato}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    color: "var(--text-light)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Esci dalla squadra
                </button>
              </div>
            )}
          </div>

          {/* ══ Progetto ══ */}
          {consegnato ? (
            <div className="card" style={{ padding: 26, textAlign: "center" }}>
              <span className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, margin: "0 auto" }}>
                <i className="fas fa-check text-2xl" />
              </span>
              <h2 className="text-xl font-bold text-gray-800 mt-5 mb-2">Progetto consegnato</h2>
              <p className="text-gray-600" style={{ maxWidth: 520, margin: "0 auto 18px", lineHeight: 1.7 }}>
                <strong>{progetto.titolo}</strong>. Adesso tocca alla Commissione. I{" "}
                {LICEI.progettiSulPalco} progetti migliori vengono presentati il{" "}
                {LICEI.dataLabel.toLowerCase()} al {LICEI.luogo}. Se siete fra quelli vi scriviamo
                noi, e all&apos;evento vi iscriviamo noi: non dovete fare nient&apos;altro.
              </p>
              <div style={{ textAlign: "left", maxWidth: 620, margin: "0 auto" }}>
                {CAMPI_PROGETTO.map((c) => (
                  <div key={c.campo} style={{ padding: "12px 0", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-light)", marginBottom: 4 }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--text-dark)", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                      {progetto[c.campo]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 22 }}>
              <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 6 }}>
                <h2 className="font-semibold text-gray-800" style={{ fontSize: 16, margin: 0 }}>
                  Il progetto
                </h2>
                <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                  {avanzamento.compilati} di {avanzamento.totali} campi compilati
                </span>
              </div>
              <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 18 }}>
                Sotto ogni domanda c&apos;è scritto quale criterio dell&apos;art. 7 alimenta, con i
                suoi punti. Non è un dettaglio burocratico: è la griglia con cui la Commissione vi
                leggerà, e sapere quanto pesa ogni risposta vi dice dove spendere il tempo.
              </p>

              {!consegneAperte && (
                <div
                  style={{
                    background: "#FFF8E6",
                    border: "1px solid #F0D89B",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: 13.5,
                    color: "#75570F",
                    lineHeight: 1.6,
                    marginBottom: 18,
                  }}
                >
                  Le consegne non sono aperte in questo momento, quindi il modulo è in sola lettura.
                </div>
              )}

              {dati?.fasi?.scadenza_consegna && consegneAperte && (
                <div
                  style={{
                    background: "#ECFAF6",
                    border: "1px solid #B4E3D8",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "#08594A",
                    marginBottom: 18,
                  }}
                >
                  Termine per la consegna: {dati.fasi.scadenza_consegna}.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label htmlFor="titolo" style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                    Titolo del progetto
                  </label>
                  <Input
                    id="titolo"
                    value={bozza.titolo}
                    maxLength={TITOLO_MAX}
                    disabled={!consegneAperte}
                    onChange={(e) => setBozza({ ...bozza, titolo: e.target.value })}
                    style={{ marginTop: 6 }}
                  />
                </div>

                <div>
                  <label htmlFor="ambito" style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                    Ambito
                  </label>
                  <p style={{ fontSize: 12, color: "var(--text-light)", margin: "3px 0 6px" }}>
                    Su quale dei tre ambiti dell&apos;art. 3 interviene il progetto.
                  </p>
                  <select
                    id="ambito"
                    value={bozza.ambito}
                    disabled={!consegneAperte}
                    onChange={(e) => setBozza({ ...bozza, ambito: e.target.value })}
                    style={{ ...boxStyle, height: 42 }}
                  >
                    <option value="">Scegli un ambito</option>
                    {AMBITI_PROGETTO.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {CAMPI_PROGETTO.map((c) => {
                  const criterio = CRITERI_LICEI.find((k) => k.criterio === c.criterio);
                  const valore = bozza[c.campo] ?? "";
                  return (
                    <div key={c.campo}>
                      <label htmlFor={c.campo} style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                        {c.label}
                      </label>
                      <p style={{ fontSize: 12, color: "var(--text-light)", margin: "3px 0 2px", lineHeight: 1.55 }}>
                        {c.aiuto}
                      </p>
                      {criterio && (
                        <p style={{ fontSize: 11.5, color: "#0A7A66", fontWeight: 600, margin: "0 0 6px" }}>
                          Criterio: {criterio.criterio} . {criterio.punti} punti su{" "}
                          {LICEI.punteggioMassimo}
                        </p>
                      )}
                      <textarea
                        id={c.campo}
                        value={valore}
                        rows={4}
                        maxLength={c.max}
                        disabled={!consegneAperte}
                        onChange={(e) => setBozza({ ...bozza, [c.campo]: e.target.value })}
                        style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
                      />
                      <div style={{ fontSize: 11, color: "var(--text-light)", textAlign: "right" }}>
                        {valore.length} / {c.max}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label htmlFor="link" style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                    Link ai materiali (facoltativo)
                  </label>
                  <p style={{ fontSize: 12, color: "var(--text-light)", margin: "3px 0 6px", lineHeight: 1.55 }}>
                    {NOTA_MATERIALI}
                  </p>
                  <Input
                    id="link"
                    placeholder="https://"
                    value={bozza.link_materiali ?? ""}
                    disabled={!consegneAperte}
                    onChange={(e) => setBozza({ ...bozza, link_materiali: e.target.value })}
                  />
                </div>
              </div>

              <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: "20px 0 14px" }}>
                {NOTA_CONSEGNA}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" disabled={occupato || !consegneAperte} onClick={salvaBozza}>
                  {salvato ? "Salvato" : "Salva la bozza"}
                </Button>
                {sonoCapo ? (
                  <Button
                    type="button"
                    disabled={occupato || !consegneAperte || membri.length < SQUADRA_MIN}
                    onClick={consegna}
                  >
                    Consegna il progetto
                  </Button>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-light)", alignSelf: "center" }}>
                    La consegna la fa il capitano della squadra.
                  </span>
                )}
              </div>

              {sonoCapo && membri.length < SQUADRA_MIN && (
                <p style={{ fontSize: 12.5, color: "#8A6100", marginTop: 10, marginBottom: 0 }}>
                  Per consegnare servono almeno {SQUADRA_MIN} componenti: l&apos;art. 3 chiede un
                  lavoro di squadra. Passa il codice a un compagno.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
