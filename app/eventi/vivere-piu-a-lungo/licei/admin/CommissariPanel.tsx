"use client";

/**
 * Pannello staff della Commissione di valutazione (art. 8).
 *
 * L'account del commissario lo crea questa schermata, come per il docente
 * referente: chiedere a un professore ordinario di registrarsi da solo su un
 * sito e poi di trovare la pagina giusta e un modo affidabile di non
 * ricevere le sue schede.
 *
 * Il diritto di voto segue il ruolo e non e una spunta libera. L'art. 8 lo
 * nega al solo referente del consorzio dei licei, che siede in Commissione
 * con funzioni consultive: lasciarlo a discrezione di chi compila il modulo
 * significherebbe poterselo dimenticare, e accorgersene a medie calcolate.
 */

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COMMISSIONE_PATH, RUOLI_COMMISSIONE, ruoloCommissioneLabel } from "../content";

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

const VUOTO = { nome: "", cognome: "", email: "", ruolo: "esperto" };

export function CommissariPanel() {
  const [righe, setRighe] = useState<Qualsiasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [nuovo, setNuovo] = useState(VUOTO);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/commissari", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setRighe(data.commissari ?? []);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const aggiungi = async () => {
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/commissari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuovo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inserimento non riuscito.");
      setAvviso(
        `${nuovo.nome} ${nuovo.cognome} è stato aggiunto alla Commissione e ha ricevuto l'email con l'accesso.`,
      );
      setNuovo(VUOTO);
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Inserimento non riuscito.");
    } finally {
      setOccupato(false);
    }
  };

  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    setOccupato(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/commissari", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito.");
      setRighe((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data.commissario, schede: r.schede } : r)),
      );
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setOccupato(false);
    }
  };

  const elimina = async (r: Qualsiasi) => {
    const schede = (r.schede?.chiuse ?? 0) + (r.schede?.aperte ?? 0);
    if (
      !confirm(
        schede > 0
          ? `Eliminare ${r.cognome} dalla Commissione cancella anche le sue ${schede} schede, e le medie si ricalcolano senza. Se si è solo dimesso a lavoro fatto, conviene disattivarlo: gli toglie l'accesso e lascia i voti dove sono. Procedere con l'eliminazione?`
          : `Eliminare ${r.cognome} dalla Commissione?`,
      )
    )
      return;
    setOccupato(true);
    try {
      const res = await fetch(`/api/eventi/licei/admin/commissari?id=${r.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eliminazione non riuscita.");
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Eliminazione non riuscita.");
    } finally {
      setOccupato(false);
    }
  };

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Commissione di valutazione</h1>
        <p className="text-sm text-gray-600">
          Art. 8 . l&apos;area dei commissari è su{" "}
          <code style={{ fontSize: 12.5 }}>{COMMISSIONE_PATH}</code>
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

      {/* ── Aggiungi ── */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Aggiungi un commissario
        </h2>
        <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
          L&apos;account viene creato qui e la persona riceve un&apos;email con il link per
          impostare la password e l&apos;indirizzo della sua area. Il diritto di voto lo determina
          il ruolo: l&apos;art. 8 lo nega al solo referente del consorzio.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            placeholder="Nome"
            value={nuovo.nome}
            onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })}
            style={{ flex: "1 1 140px" }}
          />
          <Input
            placeholder="Cognome"
            value={nuovo.cognome}
            onChange={(e) => setNuovo({ ...nuovo, cognome: e.target.value })}
            style={{ flex: "1 1 140px" }}
          />
          <Input
            placeholder="Email"
            type="email"
            value={nuovo.email}
            onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })}
            style={{ flex: "1 1 200px" }}
          />
          <select
            value={nuovo.ruolo}
            onChange={(e) => setNuovo({ ...nuovo, ruolo: e.target.value })}
            style={{ ...selectStyle, height: 40, flex: "1 1 240px" }}
          >
            {RUOLI_COMMISSIONE.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            disabled={occupato || !nuovo.nome.trim() || !nuovo.cognome.trim() || !nuovo.email.trim()}
            onClick={aggiungi}
          >
            Aggiungi
          </Button>
        </div>
      </div>

      {/* ── Elenco ── */}
      {righe.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            La Commissione è vuota. Finché non ci sono commissari attivi con diritto di voto, la
            classifica resta senza punteggi.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {righe.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                opacity: r.attivo ? 1 : 0.55,
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                  {r.cognome} {r.nome}
                </div>
                <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {r.email}
                  {r.ruolo ? ` . ${ruoloCommissioneLabel(r.ruolo)}` : ""}
                </div>
              </div>

              <span
                className="badge"
                style={{
                  background: r.diritto_voto ? "#0A7A661A" : "#8A61001A",
                  color: r.diritto_voto ? "#0A7A66" : "#8A6100",
                  flexShrink: 0,
                }}
              >
                {r.diritto_voto ? "Con voto" : "Consultivo"}
              </span>

              <span style={{ fontSize: 12.5, color: "var(--text-light)", flexShrink: 0, minWidth: 96 }}>
                {r.schede?.chiuse ?? 0} chiuse
                {r.schede?.aperte ? `, ${r.schede.aperte} in corso` : ""}
              </span>

              <select
                value={r.ruolo ?? ""}
                disabled={occupato}
                onChange={(e) => {
                  const ruolo = e.target.value;
                  const voto = RUOLI_COMMISSIONE.find((x) => x.value === ruolo)?.voto ?? true;
                  aggiorna(r.id, { ruolo, diritto_voto: voto });
                }}
                style={{ ...selectStyle, flex: "0 1 220px" }}
              >
                <option value="">Senza ruolo</option>
                {RUOLI_COMMISSIONE.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                disabled={occupato}
                onClick={() => aggiorna(r.id, { attivo: !r.attivo })}
                style={{ height: 34, fontSize: 13, flexShrink: 0 }}
              >
                {r.attivo ? "Disattiva" : "Riattiva"}
              </Button>

              <button
                type="button"
                onClick={() => elimina(r)}
                disabled={occupato}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 12.5,
                  color: "var(--text-light)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Elimina
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        Disattivare toglie l&apos;accesso e lascia le schede al loro posto, quindi le medie non
        cambiano. Eliminare cancella anche le schede, e va usato per gli inserimenti sbagliati, non
        per chi si è dimesso a lavoro fatto.
      </p>
    </div>
  );
}
