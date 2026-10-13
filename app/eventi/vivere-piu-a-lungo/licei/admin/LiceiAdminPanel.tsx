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
  AVVISO_RIFLESSIONI_OGGETTO,
  AVVISO_RIFLESSIONI_TESTO,
  INFORMATIVA_STUDENTI_PATH,
  SITE_URL,
  STATI_ADESIONE,
  statoAdesioneColore,
  statoAdesioneLabel,
  statoDocenteColore,
  statoDocenteLabel,
} from "../content";
// Solo i tipi: i moduli sono del server.
import type { DocenteProgettoVista } from "@/lib/eventi/licei-docenti";
import type { StatoAvvisoRiflessioni } from "@/lib/eventi/licei-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Adesione = any;

/** Il progresso sul corso di un istituto, aggregato sui soli confermati. */
type ProgressoIstituto = {
  confermati: number;
  lezioni_totali: number;
  fermi_a_zero: number;
  /** Non arriva piu da SQL: dipende anche dalle lezioni consegnate. */
  mai_entrati: number;
};

/** I docenti del progetto di tutti gli istituti, come li manda la rotta. */
type DocentiStaff = {
  /** Falso prima della migrazione 20261215000000. */
  disponibile: boolean;
  /** La tabella c'e, ma la lettura e fallita. */
  errore: boolean;
  per_adesione: Record<string, DocenteProgettoVista[]>;
};

const dataBreve = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Una riga di `licei_iscrizioni_stats()`: gli studenti veri di un istituto. */
type IscrizioniStat = {
  adesione_id: string;
  iscritti: number;
  in_attesa: number;
  confermate: number;
};

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

const dataOra = (iso: string): string =>
  new Date(iso).toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * L'avviso una tantum agli studenti: da ora i docenti dell'istituto leggono
 * riflessioni e domande delle consegne salvate dopo l'avviso nel box della
 * lezione. Parte una volta sola, e il bottone resta spento finche manca la
 * migrazione: annuncerebbe una funzione che non c'e ancora. Lo staff legge
 * qui il testo esatto prima di premere.
 */
export function AvvisoRiflessioni({
  stato,
  onAggiornato,
}: {
  stato: StatoAvvisoRiflessioni | null;
  onAggiornato: (s: StatoAvvisoRiflessioni) => void;
}) {
  const [inviando, setInviando] = useState(false);
  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  if (!stato) return null;

  const invia = async () => {
    if (
      !window.confirm(
        `Inviare l'avviso sulle riflessioni a ${stato.iscritti} iscritti (confermati e in attesa)? Si può inviare una volta sola.`,
      )
    ) {
      return;
    }
    setInviando(true);
    setMessaggio(null);
    try {
      const res = await fetch("/api/eventi/licei/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "avviso_riflessioni" }),
      });
      const data = await res.json();
      if (res.ok) {
        const esito = { destinatari: data.destinatari ?? 0, inviate: data.inviate ?? 0, fallite: data.fallite ?? 0 };
        onAggiornato({ ...stato, inviato_at: data.inviato_at ?? new Date().toISOString(), esito });
        setMessaggio({
          testo: `Inviato: ${esito.inviate} email partite su ${esito.destinatari}${
            esito.fallite > 0 ? `, ${esito.fallite} non riuscite (i dettagli sono nei log)` : ""
          }.`,
          errore: false,
        });
        return;
      }
      // Gia inviato da un altro, nel frattempo: il pannello lo mostra.
      if (res.status === 409 && data.inviato_at) {
        onAggiornato({ ...stato, inviato_at: data.inviato_at });
      }
      if (data.colonna === "assente") onAggiornato({ ...stato, colonna: "assente" });
      setMessaggio({ testo: data.error || "Invio non riuscito.", errore: true });
    } catch {
      setMessaggio({ testo: "Invio non riuscito: controlla la connessione e riprova.", errore: true });
    } finally {
      setInviando(false);
    }
  };

  const informativaUrl = `${SITE_URL}${INFORMATIVA_STUDENTI_PATH}`;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 4 }}>
        <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: 0 }}>
          Avviso agli studenti sulle riflessioni
        </h2>
        {stato.inviato_at ? (
          <span className="badge" style={{ background: "#0A7A661A", color: "#0A7A66" }}>
            Inviato
          </span>
        ) : (
          <span className="badge" style={{ background: "#8A61001A", color: "#8A6100" }}>
            Non ancora inviato
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 12 }}>
        I docenti dell&apos;istituto leggono riflessione e domanda delle sole consegne salvate dopo
        l&apos;avviso nel box della lezione; le precedenti e i commenti restano allo staff. Questa
        email lo comunica a tutti gli iscritti, confermati e in attesa. Parte una volta sola.
      </p>

      {stato.inviato_at ? (
        <p className="text-sm" style={{ color: "var(--text-dark)", lineHeight: 1.7, margin: "0 0 12px" }}>
          Inviato il {dataOra(stato.inviato_at)}
          {stato.esito
            ? `: ${stato.esito.inviate} email partite su ${stato.esito.destinatari}${
                stato.esito.fallite > 0 ? `, ${stato.esito.fallite} non riuscite (i dettagli sono nei log)` : ""
              }.`
            : "."}
        </p>
      ) : stato.colonna === "assente" ? (
        <p className="text-sm" style={{ color: "#8A6100", lineHeight: 1.7, margin: "0 0 12px" }}>
          Prima applica la migrazione 20261215000000: senza la colonna condivisa_referente_at
          l&apos;avviso annuncerebbe una funzione non ancora attiva.
        </p>
      ) : stato.colonna === "errore" ? (
        <p className="text-sm" style={{ color: "#B44A5E", lineHeight: 1.7, margin: "0 0 12px" }}>
          Non è stato possibile verificare la migrazione: ricarica il pannello.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 12 }}>
          <Button type="button" disabled={inviando || stato.iscritti === 0} onClick={invia}>
            <i className="fas fa-envelope" style={{ marginRight: 8 }} />
            {inviando ? "Invio in corso…" : "Invia avviso sulle riflessioni"}
          </Button>
          <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
            {stato.iscritti === 0
              ? "Nessuno studente iscritto per ora."
              : `${stato.iscritti} iscritti, un'email per indirizzo.`}
          </span>
        </div>
      )}

      {messaggio && (
        <p
          style={{
            color: messaggio.errore ? "#E74C6F" : "#0A7A66",
            fontSize: 13.5,
            margin: "0 0 12px",
            lineHeight: 1.6,
          }}
        >
          {messaggio.testo}
        </p>
      )}

      <details className="text-sm text-gray-600">
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-dark)" }}>
          Il testo dell&apos;email
        </summary>
        <div
          style={{
            marginTop: 10,
            background: "var(--bg-light)",
            borderRadius: 10,
            padding: "12px 14px",
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            <strong>Oggetto:</strong> {AVVISO_RIFLESSIONI_OGGETTO}
          </p>
          <p style={{ margin: "0 0 8px" }}>Ciao (nome dello studente),</p>
          <p style={{ margin: "0 0 8px" }}>{AVVISO_RIFLESSIONI_TESTO.apertura}</p>
          <p style={{ margin: "0 0 8px", overflowWrap: "anywhere" }}>
            {AVVISO_RIFLESSIONI_TESTO.informativa}{" "}
            <a href={informativaUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary-dark)" }}>
              {informativaUrl}
            </a>
            .
          </p>
          <p style={{ margin: 0 }}>{AVVISO_RIFLESSIONI_TESTO.dubbi}</p>
        </div>
      </details>
    </div>
  );
}

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
  // I numeri veri delle iscrizioni, per adesione. Distinti dalle previsioni
  // dichiarate, che vivono sulla riga dell'adesione stessa.
  const [iscrizioni, setIscrizioni] = useState<Record<string, IscrizioniStat>>({});
  const [progresso, setProgresso] = useState<Record<string, ProgressoIstituto>>({});
  const [totaleLezioni, setTotaleLezioni] = useState(0);
  const [docenti, setDocenti] = useState<DocentiStaff>({ disponibile: false, errore: false, per_adesione: {} });
  const [avvisoRiflessioni, setAvvisoRiflessioni] = useState<StatoAvvisoRiflessioni | null>(null);
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
      const perAdesione: Record<string, IscrizioniStat> = {};
      for (const r of (data.iscrizioni_stats ?? []) as IscrizioniStat[]) {
        perAdesione[r.adesione_id] = r;
      }
      setIscrizioni(perAdesione);
      setProgresso(data.progresso ?? {});
      setTotaleLezioni(data.totale_lezioni ?? 0);
      setDocenti(data.docenti ?? { disponibile: false, errore: false, per_adesione: {} });
      setAvvisoRiflessioni(data.avviso_riflessioni ?? null);
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

  // Revoca di un docente del progetto, per esempio su richiesta
  // dell'istituto. Ha effetto alla sua richiesta successiva.
  const revocaDocente = async (d: DocenteProgettoVista) => {
    if (
      !window.confirm(
        `Revocare l'accesso di ${d.nome} ${d.cognome}? Da subito non vedrà più i dati degli studenti dell'istituto.`,
      )
    ) {
      return;
    }
    setSalvando(d.id);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione: "revoca_docente", id: d.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoca non riuscita.");
      setDocenti((prima) => {
        const per_adesione: Record<string, DocenteProgettoVista[]> = {};
        for (const [k, v] of Object.entries(prima.per_adesione)) {
          per_adesione[k] = v.map((x) =>
            x.id === d.id ? { ...x, stato: "revocato", revocato_at: new Date().toISOString(), rimanda_dal: null } : x,
          );
        }
        return { ...prima, per_adesione };
      });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Revoca non riuscita.");
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

  // Media di lezioni completate per studente confermato di un istituto. Una
  // media e non un totale: il totale premierebbe la scuola grande, e qui
  // interessa se i ragazzi stanno seguendo, non quanti sono.
  const mediaLezioni = (adesioneId: string): number | null => {
    const p = progresso[adesioneId];
    if (!p || p.confermati === 0) return null;
    return p.lezioni_totali / p.confermati;
  };

  // I totali veri si sommano su tutte le iscrizioni esistenti, non solo su
  // quelle degli istituti a schermo: la ricerca filtra l'elenco, non la
  // realta, e un totale che cambia mentre si digita non e un totale.
  const totaliVeri = useMemo(() => {
    let iscritti = 0;
    let confermati = 0;
    let maiEntrati = 0;
    for (const s of Object.values(iscrizioni)) {
      iscritti += Number(s.iscritti ?? 0);
      confermati += Number(s.confermate ?? 0);
    }
    // "Mai entrati" arriva dal blocco del progresso e non da quello delle
    // iscrizioni: dipende anche dalle lezioni consegnate, che SQL non vede.
    for (const p of Object.values(progresso)) maiEntrati += Number(p.mai_entrati ?? 0);
    return { iscritti, confermati, maiEntrati };
  }, [iscrizioni, progresso]);

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
          Il bando rimanda i termini al referente del consorzio degli istituti superiori.
          Quando arriva la data, scrivila qui: compare in cima alla pagina pubblica senza
          bisogno di un rilascio del sito.
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
          Conferma delle adesioni
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Con la conferma automatica l&apos;adesione nasce già confermata e il docente riceve
          subito il codice per gli studenti. Le adesioni vanno comunque controllate qui: se una
          non è autentica, mettila su &quot;Ritirata&quot; e il codice smette di accettare
          iscrizioni. Vale solo per le adesioni nuove.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--text-light)", maxWidth: 360 }}>
          Modalità
          <select
            value={config.conferma_adesioni ?? "automatica"}
            onChange={(e) => salvaConfig({ conferma_adesioni: e.target.value })}
            style={{ ...selectStyle, minWidth: 280 }}
          >
            <option value="automatica">Automatica, l&apos;istituto è attivo subito</option>
            <option value="manuale">Manuale, la conferma la dà lo staff</option>
          </select>
        </label>

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

      {/* L'avviso agli studenti sulle riflessioni lette dai docenti. */}
      <AvvisoRiflessioni stato={avvisoRiflessioni} onAggiornato={setAvvisoRiflessioni} />

      {/* Conteggi. La prima riga sono gli istituti e le previsioni che hanno
          dichiarato aderendo. La seconda sono gli studenti veri: fino a che
          non c'erano, "Studenti previsti" era l'unico numero a schermo e si
          leggeva come un'iscrizione, che non e. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{rows.length}</div>
          <div className="stat-label">Istituti in elenco</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.confermate}</div>
          <div className="stat-label">Istituti confermati</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.studenti}</div>
          <div className="stat-label">Studenti previsti dagli istituti</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>{totali.evento}</div>
          <div className="stat-label">Attesi al PalaMazzola</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "var(--primary-dark)" }}>
            {totaliVeri.iscritti}
          </div>
          <div className="stat-label">Studenti iscritti davvero</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: "var(--primary-dark)" }}>
            {totaliVeri.confermati}
          </div>
          <div className="stat-label">Confermati dal referente</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div
            className="stat-number"
            style={{ fontSize: 26, color: totaliVeri.maiEntrati > 0 ? "#B44A5E" : undefined }}
          >
            {totaliVeri.maiEntrati}
          </div>
          <div className="stat-label">Mai entrati nel corso</div>
        </div>
        <div className="card-sm" style={{ padding: 16, display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6 }}>
            I numeri di questa riga sono iscrizioni vere. Quelli sopra sono le previsioni
            dichiarate dagli istituti quando hanno aderito.
          </div>
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
              {/* Previsti e veri sulla stessa riga. Un istituto confermato a
                  settembre con zero iscritti a ottobre e il caso che questo
                  pannello non sapeva mostrare, ed e quello su cui si
                  interviene. */}
              <span style={{ fontSize: 13, flexShrink: 0, textAlign: "right", lineHeight: 1.5 }}>
                <span style={{ display: "block", fontWeight: 700, color: "var(--primary-dark)" }}>
                  {iscrizioni[r.id]?.iscritti ?? 0} iscritti
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-light)" }}>
                  su {r.studenti_totale} previsti
                </span>
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
                  {/* I docenti del progetto indicati dal referente. Lo
                      staff li vede tutti, revocati compresi, e li revoca
                      quando l'istituto scrive che non e corretto. */}
                  <div style={{ display: "flex", gap: 14, padding: "9px 0", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-light)", width: 190, flexShrink: 0 }}>
                      Docenti del progetto
                    </span>
                    <div style={{ fontSize: 13.5, color: "var(--text-dark)", lineHeight: 1.6, flex: 1, minWidth: 0 }}>
                      {!docenti.disponibile ? (
                        <span style={{ color: "var(--text-light)" }}>
                          {docenti.errore
                            ? "Lettura non riuscita: ricarica il pannello."
                            : "Funzione in attivazione: manca la migrazione 20261215000000."}
                        </span>
                      ) : (docenti.per_adesione[r.id] ?? []).length === 0 ? (
                        <span style={{ color: "var(--text-light)" }}>Nessuno indicato.</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {(docenti.per_adesione[r.id] ?? []).map((d) => (
                            <div key={d.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                              <span style={{ flex: "1 1 260px", minWidth: 0, overflowWrap: "anywhere" }}>
                                {d.nome} {d.cognome} . {d.email}
                                {d.classi.length > 0 ? ` . classi ${d.classi.join(", ")}` : ""}
                                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-light)" }}>
                                  Indicato il {dataBreve(d.invitato_at)}
                                  {d.stato === "revocato"
                                    ? ` . revocato il ${dataBreve(d.revocato_at)}`
                                    : d.istruzioni_accettate_at
                                      ? ` . istruzioni accettate il ${dataBreve(d.istruzioni_accettate_at)}`
                                      : " . istruzioni non ancora accettate"}
                                </span>
                              </span>
                              <span
                                className="badge"
                                style={{
                                  background: `${statoDocenteColore(d.stato)}1A`,
                                  color: statoDocenteColore(d.stato),
                                  flexShrink: 0,
                                }}
                              >
                                {statoDocenteLabel(d.stato)}
                              </span>
                              {d.stato !== "revocato" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={salvando === d.id}
                                  onClick={() => revocaDocente(d)}
                                  style={{ color: "#B44A5E" }}
                                >
                                  Revoca
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Riga label="Studenti iscritti davvero">
                    {iscrizioni[r.id]
                      ? `${iscrizioni[r.id].iscritti} iscritti . ${iscrizioni[r.id].confermate} confermati dal referente . ${iscrizioni[r.id].in_attesa} da confermare${
                          Number(progresso[r.id]?.mai_entrati ?? 0) > 0
                            ? ` . ${progresso[r.id].mai_entrati} non sono mai entrati nel corso`
                            : ""
                        }`
                      : "Nessuna iscrizione ancora."}
                  </Riga>
                  <Riga label="Avanzamento sul corso">
                    {(() => {
                      const p = progresso[r.id];
                      if (!p || p.confermati === 0) return "Nessuno studente confermato.";
                      const media = mediaLezioni(r.id);
                      return `${media === null ? "0" : media.toFixed(1)} lezioni di media su ${totaleLezioni}, per ${p.confermati} studenti confermati${
                        p.fermi_a_zero > 0 ? ` . ${p.fermi_a_zero} non ne ha completata nessuna` : ""
                      }`;
                    })()}
                  </Riga>
                  <Riga label="Studenti previsti all'adesione">
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
