"use client";

/**
 * L'elenco delle candidature, e il punto in cui qualcuno le guarda.
 *
 * Nei licei e il docente referente a dire "questo ragazzo e mio", e senza
 * quella conferma lo studente non fa niente. Qui il referente non esiste:
 * il suo posto lo prendono lo stato della candidatura e questa schermata,
 * che e l'unico posto del sito da cui quello stato si cambia. Da qui
 * discende tutto il resto, perche solo una candidatura confermata entra in
 * una squadra e solo una squadra consegna.
 *
 * La riga che conta di piu non e quella esclusa: e quella senza account.
 * Una persona senza `user_id` risulta regolarmente candidata, compare nei
 * contatori, e non puo entrare da nessuna parte, perche non ha un account
 * con cui accedere al corso ne una password da scegliere. Sono le
 * candidature raccolte prima che la rotta creasse l'utente, e quelle in cui
 * la creazione e fallita in silenzio. Finche questo pannello non esisteva
 * nessuno poteva vederle, e da fuori quelle persone sembravano semplicemente
 * poco interessate. Per questo hanno un filtro loro e non solo un'icona: si
 * riparano una per una con il bottone che rimanda il link.
 *
 * Il filtro per area disciplinare risponde a un'altra domanda, che l'art. 2
 * pone e nessun contatore riassume: chi c'e, di preciso, quando si deve
 * comporre una squadra interdisciplinare o abbinare un mentor.
 */

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AREE_DISCIPLINARI,
  STATI_CANDIDATURA,
  STUDENTE_PATH,
  areaLabel,
  livelloLabel,
  statoCandidaturaColore,
  statoCandidaturaLabel,
} from "../content";

// La rotta torna righe intere della tabella piu due campi derivati, e le
// colonne le decide la migrazione: ricopiarne qui l'elenco creerebbe un
// secondo posto da aggiornare a ogni colonna nuova.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/admin";

const NOTA_OK: React.CSSProperties = {
  background: "#ECFAF6",
  border: "1px solid #B4E3D8",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  color: "#08594A",
};

const NOTA_ATTESA: React.CSSProperties = {
  background: "#FFF8E6",
  border: "1px solid #F0D89B",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "#75570F",
  lineHeight: 1.6,
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

const COLORE_ATTESA = statoCandidaturaColore("candidata");

const dataIt = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleString("it-IT") : "";

function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "9px 0",
        borderTop: "1px solid var(--border-color)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-light)",
          width: 190,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13.5,
          color: "var(--text-dark)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export function CandidaturePanel({
  candidature,
  totaleLezioni,
  onCandidatura,
}: {
  candidature: Qualsiasi[];
  totaleLezioni: number;
  onCandidatura: (riga: Qualsiasi) => void;
}) {
  const [q, setQ] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroAccount, setFiltroAccount] = useState("");
  const [aperta, setAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  /**
   * Un solo canale per le mutazioni e per i loro errori.
   *
   * La rotta torna la riga aggiornata, quindi dopo un comando non si rilegge
   * niente: si sostituisce la riga in mano al pannello. Rileggere tutto
   * costerebbe anche la posizione nello scorrimento, che con trecento righe
   * e la cosa che da piu fastidio perdere dopo aver cambiato uno stato.
   */
  const chiama = async (
    id: string,
    metodo: "PATCH" | "POST",
    corpo: Record<string, unknown>,
  ): Promise<Qualsiasi | null> => {
    setOccupato(id);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch(ROTTA, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...corpo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      if (data.candidatura) onCandidatura(data.candidatura);
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(null);
    }
  };

  /**
   * Rimanda il link di accesso, e dice la verita su che cosa e successo.
   *
   * La rotta risponde con `inviata`, che e falso quando Resend non e
   * configurato o l'invio e fallito. In quel caso l'account esiste
   * comunque ed e agganciato alla candidatura, ma la persona non ha
   * ricevuto niente: scrivere "fatto" la lascerebbe fuori senza che nessuno
   * se ne accorga.
   */
  const rimandaAccesso = async (c: Qualsiasi) => {
    const data = await chiama(c.id, "POST", {});
    if (!data) return;
    onCandidatura({ id: c.id, user_id: data.user_id });
    setAvviso(
      data.inviata
        ? `Il link di accesso è stato inviato a ${c.email}. L'account è collegato alla candidatura.`
        : `L'account di ${c.email} è pronto e collegato alla candidatura, ma l'email non è partita. Controlla la configurazione dell'invio e riprova, oppure passale il link dalla pagina di recupero password.`,
    );
  };

  const righe = useMemo(() => {
    const cerca = q.trim().toLowerCase();
    return candidature.filter((c) => {
      if (filtroStato && c.stato !== filtroStato) return false;
      if (filtroArea && c.area !== filtroArea) return false;
      if (filtroAccount === "senza" && c.user_id) return false;
      if (filtroAccount === "con" && !c.user_id) return false;
      if (!cerca) return true;
      return [c.nome, c.cognome, c.email, c.universita, c.corso_studi, c.codice, c.squadra_nome]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(cerca));
    });
  }, [candidature, q, filtroStato, filtroArea, filtroAccount]);

  // Il conteggio si fa su tutte le candidature e non su quelle a schermo: i
  // filtri cambiano l'elenco, non la realta, e un numero che scende mentre
  // si digita non e un numero.
  const senzaAccount = useMemo(
    () => candidature.filter((c) => !c.user_id).length,
    [candidature],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Candidature</h1>
          <p className="text-sm text-gray-600">
            Art. 4 . lo stato decide chi entra nel percorso, l&apos;area del partecipante è su{" "}
            <code style={{ fontSize: 12.5 }}>{STUDENTE_PATH}</code>
          </p>
        </div>
        <a
          href={`${ROTTA}/export?cosa=candidature`}
          className="btn-primary"
          style={{ fontSize: 13 }}
        >
          <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
          Esporta CSV
        </a>
      </div>

      {/* Il numero sta in cima e non dentro un filtro: e la cosa che si deve
          vedere senza cercarla, perche ogni riga qui dentro e una persona
          che risulta iscritta e non puo entrare da nessuna parte. */}
      {senzaAccount > 0 && (
        <div style={NOTA_ATTESA}>
          <strong>
            {senzaAccount}{" "}
            {senzaAccount === 1
              ? "candidatura non ha un account"
              : "candidature non hanno un account"}
            .
          </strong>{" "}
          Queste persone risultano iscritte ma non possono accedere al corso né alla loro area:
          non esiste un utente con cui farlo. Si riparano una per una con &quot;Invia il link di
          accesso&quot;, che crea l&apos;account se manca, lo collega alla candidatura e manda il
          link per scegliere la password.
        </div>
      )}

      {avviso && <div style={NOTA_OK}>{avviso}</div>}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ── Filtri ──
          Tutti in memoria: la rotta torna l'elenco intero apposta, e con
          qualche centinaio di righe filtrare qui e immediato, mentre ogni
          filtro sul server sarebbe un giro di rete per cambiare idea. */}
      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <Input
          placeholder="Cerca per nome, email, università, corso, codice o squadra"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 280px" }}
        />
        <select
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tutti gli stati</option>
          {STATI_CANDIDATURA.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filtroArea}
          onChange={(e) => setFiltroArea(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tutte le aree</option>
          {AREE_DISCIPLINARI.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          value={filtroAccount}
          onChange={(e) => setFiltroAccount(e.target.value)}
          style={selectStyle}
        >
          <option value="">Account: tutti</option>
          <option value="senza">Solo senza account</option>
          <option value="con">Solo con account</option>
        </select>
        <span style={{ fontSize: 12.5, color: "var(--text-light)", marginLeft: "auto" }}>
          {righe.length} di {candidature.length}
        </span>
      </div>

      {righe.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            {candidature.length === 0
              ? "Nessuna candidatura ancora. Compaiono qui appena qualcuno invia il modulo del bando."
              : "Nessuna candidatura corrisponde ai filtri."}
          </p>
        </div>
      )}

      {righe.map((c) => {
        const espansa = aperta === c.id;
        const colore = statoCandidaturaColore(c.stato);
        const senza = !c.user_id;
        return (
          <div key={c.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setAperta(espansa ? null : c.id)}
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
                <i className="fas fa-user-graduate" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="block font-semibold text-gray-800" style={{ fontSize: 15 }}>
                  {c.cognome} {c.nome}
                </span>
                <span className="block text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {c.email} . {c.universita} . {c.corso_studi}
                </span>
              </span>

              {/* Le lezioni consegnate sono il dato che distingue un percorso
                  con trecento iscritti da uno con trecento indirizzi. */}
              <span
                style={{ fontSize: 13, flexShrink: 0, textAlign: "right", lineHeight: 1.5 }}
              >
                <span style={{ display: "block", fontWeight: 700, color: "var(--primary-dark)" }}>
                  {senza ? "." : `${c.lezioni_completate ?? 0} / ${totaleLezioni}`}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-light)" }}>
                  lezioni
                </span>
              </span>

              {senza && (
                <span
                  className="badge"
                  style={{
                    background: `${COLORE_ATTESA}1A`,
                    color: COLORE_ATTESA,
                    flexShrink: 0,
                  }}
                >
                  Senza account
                </span>
              )}

              <span
                className="badge"
                style={{ background: `${colore}1A`, color: colore, flexShrink: 0 }}
              >
                {statoCandidaturaLabel(c.stato)}
              </span>

              <i
                className={`fas fa-chevron-${espansa ? "up" : "down"} text-sm`}
                style={{ color: "var(--text-light)", flexShrink: 0 }}
                aria-hidden="true"
              />
            </button>

            {espansa && (
              <div
                style={{
                  padding: "0 20px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
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
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-light)",
                    }}
                  >
                    Stato
                    <select
                      value={c.stato}
                      disabled={occupato === c.id}
                      onChange={(e) => chiama(c.id, "PATCH", { stato: e.target.value })}
                      style={selectStyle}
                    >
                      {STATI_CANDIDATURA.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>

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
                    Note interne
                    <Input
                      key={`nota-${c.id}-${c.note_staff ?? ""}`}
                      defaultValue={c.note_staff ?? ""}
                      placeholder="Non le vede il candidato"
                      disabled={occupato === c.id}
                      onBlur={(e) => {
                        if (e.target.value !== (c.note_staff ?? "")) {
                          chiama(c.id, "PATCH", { note_staff: e.target.value });
                        }
                      }}
                    />
                  </label>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={occupato === c.id}
                    onClick={() => rimandaAccesso(c)}
                  >
                    Invia il link di accesso
                  </Button>

                  {occupato === c.id && (
                    <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
                  )}
                </div>

                <div>
                  <Riga label="Codice">
                    <span style={{ fontFamily: "monospace" }}>{c.codice}</span>
                  </Riga>
                  <Riga label="Università">{c.universita}</Riga>
                  <Riga label="Corso di studi">
                    {`${c.corso_studi} . ${livelloLabel(c.livello)}`}
                  </Riga>
                  <Riga label="Area disciplinare">
                    {`${areaLabel(c.area)}${c.area_altro ? ` . ${c.area_altro}` : ""}`}
                  </Riga>
                  <Riga label="Interessi di ricerca">{c.interessi}</Riga>
                  <Riga label="Account">
                    {c.user_id
                      ? `Collegato . ${c.lezioni_completate ?? 0} lezioni completate su ${totaleLezioni}`
                      : "Nessun account. Questa persona non può accedere al corso finché non le viene mandato il link."}
                  </Riga>
                  <Riga label="Squadra">
                    {c.squadra_id
                      ? `${c.squadra_nome ?? "(senza nome)"}${c.squadra_ruolo === "capo" ? " . capitano" : ""}`
                      : "Nessuna squadra"}
                  </Riga>
                  <Riga label="Bacheca">
                    {c.cerca_squadra
                      ? `Cerca compagni${c.consenso_board ? " . con consenso" : " . senza consenso, quindi non compare"}`
                      : "Non in bacheca"}
                  </Riga>
                  <Riga label="Nota di bacheca">{c.board_nota}</Riga>
                  <Riga label="Note staff">{c.note_staff}</Riga>
                  <Riga label="Stato aggiornato il">{dataIt(c.stato_aggiornato_at)}</Riga>
                  <Riga label="Candidatura del">{dataIt(c.created_at)}</Riga>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
