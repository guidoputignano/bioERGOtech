"use client";

/**
 * Le candidature a mentor (art. 3) e l'abbinamento con le squadre (art. 5).
 *
 * Due cose accadono qui e da nessun'altra parte.
 *
 * La prima e la decisione. Un ricercatore che si propone da fuori resta "in
 * valutazione" finche qualcuno non guarda la sua riga, e approvarla e il
 * momento in cui nasce il suo account, perche e il momento in cui diventa
 * qualcuno che ha qualcosa da vedere. Fino ad allora un account sarebbe una
 * casella vuota consegnata a una persona che non ha chiesto di registrarsi
 * su questo sito.
 *
 * La seconda e l'abbinamento. L'art. 5 promette "mentoring e accompagnamento
 * alla progettazione scientifica lungo tutto il percorso": senza una riga
 * che leghi un mentor a una squadra quella promessa resta una frase in
 * pagina, e il mentor non vede nessun progetto, perche la policy che glieli
 * mostra parte proprio da li.
 *
 * Approvato e pubblicato non sono la stessa cosa, ed e la confusione che
 * questo pannello esiste per evitare. Il consenso alla pubblicazione e
 * facoltativo: si puo fare il mentor senza comparire nell'elenco pubblico.
 * Chi non lo ha dato viene segnalato in chiaro su ogni riga approvata,
 * altrimenti lo staff passerebbe il pomeriggio a chiedersi perche la pagina
 * dei mentor non lo elenca e finirebbe per cercare un errore che non c'e.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MENTOR_PATH,
  STATI_MENTOR,
  areaLabel,
  disponibilitaMentorLabel,
  ruoloMentorLabel,
  statoMentorColore,
  statoMentorLabel,
  statoProgettoColoreUniversita,
} from "../content";

// Le righe arrivano intere da `universita_mentor`, piu le squadre innestate
// dalla rotta: le colonne le decide la migrazione.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/admin/mentor";
const ROTTA_EXPORT = "/api/eventi/universita/admin/export?cosa=mentor";

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

const COLORE_ATTESA = statoProgettoColoreUniversita("bozza");
const COLORE_SPENTO = statoProgettoColoreUniversita("ritirato");

/** I tre atti dello staff su una candidatura, nell'ordine in cui si usano. */
const AZIONI = [
  { stato: "approvata", label: "Approva" },
  { stato: "respinta", label: "Respingi" },
  { stato: "sospesa", label: "Sospendi" },
] as const;

const NOTA_ABBINAMENTO_MAX = 500;

const dataIt = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "";

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

export function MentorPanel() {
  const [righe, setRighe] = useState<Qualsiasi[]>([]);
  const [squadre, setSquadre] = useState<Qualsiasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const [filtroStato, setFiltroStato] = useState("");
  const [scelta, setScelta] = useState<Record<string, string>>({});
  const [notaAbbinamento, setNotaAbbinamento] = useState<Record<string, string>>({});

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(ROTTA, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setRighe(data.mentor ?? []);
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

  /** Un solo canale per le mutazioni e per i loro errori. */
  const chiama = async (
    chiave: string,
    metodo: "PATCH" | "POST" | "DELETE",
    corpo: Record<string, unknown>,
    url: string = ROTTA,
  ): Promise<Qualsiasi | null> => {
    setOccupato(chiave);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(null);
    }
  };

  /**
   * Salva stato o note.
   *
   * La riga che torna e la riga di tabella e non porta con se le squadre
   * seguite, che la GET innesta da un'altra lettura. Mettendo prima la
   * vecchia nello spread, gli abbinamenti restano al loro posto invece di
   * sparire dalla schermata al primo cambio di stato.
   */
  const aggiorna = async (m: Qualsiasi, patch: Record<string, unknown>) => {
    const data = await chiama(m.id, "PATCH", { id: m.id, ...patch });
    if (!data?.mentor) return;
    setRighe((prev) => prev.map((r) => (r.id === m.id ? { ...r, ...data.mentor } : r)));

    if (patch.stato === "approvata") {
      setAvviso(
        data.mentor.consenso_pubblicazione
          ? `${m.nome} ${m.cognome} è ora un mentor del percorso e comparirà nella pagina pubblica.`
          : `${m.nome} ${m.cognome} è ora un mentor del percorso, ma non comparirà nella pagina pubblica: non ha dato il consenso alla pubblicazione. Può seguire un team lo stesso.`,
      );
    }
  };

  /**
   * Abbina un mentor a una squadra.
   *
   * La risposta della POST ha la forma della riga di `universita_mentor_squadre`,
   * cioe `id`, mentre la GET innesta lo stesso abbinamento come
   * `assegnazione_id` con dentro il nome della squadra. Qui si ricompone la
   * seconda forma con i dati gia in mano: senza, la riga appena creata non
   * avrebbe un nome da mostrare e il bottone che la toglie leggerebbe un id
   * che non c'e.
   */
  const abbina = async (m: Qualsiasi) => {
    const squadraId = scelta[m.id] ?? "";
    if (!squadraId) return;
    const nota = (notaAbbinamento[m.id] ?? "").trim();

    const data = await chiama(m.id, "POST", {
      mentor_id: m.id,
      squadra_id: squadraId,
      nota: nota || null,
    });
    if (!data?.assegnazione) return;

    const squadra = squadre.find((s) => s.id === squadraId);
    const voce = {
      assegnazione_id: data.assegnazione.id,
      squadra_id: data.assegnazione.squadra_id,
      nome: squadra?.nome ?? null,
      codice: squadra?.codice ?? null,
      stato: squadra?.stato ?? null,
      nota: data.assegnazione.nota,
      created_at: data.assegnazione.created_at,
    };
    setRighe((prev) =>
      prev.map((r) => (r.id === m.id ? { ...r, squadre: [...(r.squadre ?? []), voce] } : r)),
    );
    setScelta((prev) => ({ ...prev, [m.id]: "" }));
    setNotaAbbinamento((prev) => ({ ...prev, [m.id]: "" }));
    setAvviso(
      `${m.nome} ${m.cognome} segue ora ${squadra?.nome ?? "la squadra"}. Da adesso vede il progetto del team.`,
    );
  };

  /**
   * Toglie un abbinamento. Cade solo la riga del legame: il mentor resta
   * approvato e il progetto resta della squadra, quindi un abbinamento
   * sbagliato si corregge spostandolo su un altro team.
   */
  const togliAbbinamento = async (m: Qualsiasi, voce: Qualsiasi) => {
    if (!confirm(`Togliere ${m.nome} ${m.cognome} da ${voce.nome ?? "questa squadra"}?`)) return;
    const data = await chiama(
      m.id,
      "DELETE",
      { id: voce.assegnazione_id },
      `${ROTTA}?id=${voce.assegnazione_id}`,
    );
    if (!data) return;
    setRighe((prev) =>
      prev.map((r) =>
        r.id === m.id
          ? {
              ...r,
              squadre: (r.squadre ?? []).filter(
                (v: Qualsiasi) => v.assegnazione_id !== voce.assegnazione_id,
              ),
            }
          : r,
      ),
    );
  };

  const elenco = useMemo(
    () => (filtroStato ? righe.filter((r) => r.stato === filtroStato) : righe),
    [righe, filtroStato],
  );

  // Solo le squadre aperte: la rotta rifiuta l'abbinamento a una squadra
  // sciolta, e mostrarla nella tendina vorrebbe dire offrire una scelta che
  // finisce in un errore.
  const squadreAperte = useMemo(
    () => squadre.filter((s) => s.stato === "aperta"),
    [squadre],
  );

  // Approvati senza consenso: il numero che spiega la differenza fra questo
  // elenco e la pagina pubblica dei mentor.
  const senzaConsenso = useMemo(
    () => righe.filter((r) => r.stato === "approvata" && !r.consenso_pubblicazione).length,
    [righe],
  );

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mentor</h1>
          <p className="text-sm text-gray-600">
            Art. 3 e art. 5 . la pagina pubblica è su{" "}
            <code style={{ fontSize: 12.5 }}>{MENTOR_PATH}</code>
          </p>
        </div>
        <a href={ROTTA_EXPORT} className="btn-primary" style={{ fontSize: 13 }}>
          <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
          Esporta CSV
        </a>
      </div>

      {senzaConsenso > 0 && (
        <div style={NOTA_ATTESA}>
          <strong>
            {senzaConsenso === 1
              ? "1 mentor approvato non compare nella pagina pubblica"
              : `${senzaConsenso} mentor approvati non compaiono nella pagina pubblica`}
            .
          </strong>{" "}
          Non è un errore e non si corregge da qui: non hanno dato il consenso alla
          pubblicazione, che è facoltativo. Restano mentor a tutti gli effetti, possono seguire un
          team e vederne il progetto. Per comparire in elenco devono cambiare idea loro.
        </div>
      )}

      {avviso && <div style={NOTA_OK}>{avviso}</div>}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      <div className="card-sm flex flex-wrap gap-3 items-center" style={{ padding: 14 }}>
        <select
          value={filtroStato}
          onChange={(e) => setFiltroStato(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tutti gli stati</option>
          {STATI_MENTOR.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12.5, color: "var(--text-light)" }}>
          {elenco.length} di {righe.length}
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-light)", marginLeft: "auto" }}>
          {squadreAperte.length === 1
            ? "1 squadra aperta a cui abbinare un mentor"
            : `${squadreAperte.length} squadre aperte a cui abbinare un mentor`}
        </span>
      </div>

      {elenco.length === 0 && (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            {righe.length === 0
              ? "Nessuna candidatura a mentor. Compaiono qui appena qualcuno invia il modulo della pagina dei mentor."
              : "Nessuna candidatura in questo stato."}
          </p>
        </div>
      )}

      {elenco.map((m) => {
        const espansa = aperta === m.id;
        const colore = statoMentorColore(m.stato);
        const seguite: Qualsiasi[] = m.squadre ?? [];
        const approvatoNonPubblicato = m.stato === "approvata" && !m.consenso_pubblicazione;
        const aree: string[] = m.aree ?? [];
        // Le squadre che gia segue non ricompaiono nella tendina: la rotta
        // rifiuterebbe il doppione con un 409, e offrirlo e un invito a
        // sbagliare.
        const gia = new Set(seguite.map((v) => v.squadra_id));
        const disponibili = squadreAperte.filter((s) => !gia.has(s.id));

        return (
          <div key={m.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setAperta(espansa ? null : m.id)}
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
                <i className="fas fa-user-tie" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="block font-semibold text-gray-800" style={{ fontSize: 15 }}>
                  {m.cognome} {m.nome}
                </span>
                <span className="block text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {ruoloMentorLabel(m.ruolo)} . {m.organizzazione}
                  {aree.length > 0 ? ` . ${aree.map(areaLabel).join(", ")}` : ""}
                </span>
              </span>

              {seguite.length > 0 && (
                <span
                  className="badge"
                  style={{
                    background: `${statoMentorColore("approvata")}1A`,
                    color: statoMentorColore("approvata"),
                    flexShrink: 0,
                  }}
                >
                  {seguite.length === 1 ? "1 squadra" : `${seguite.length} squadre`}
                </span>
              )}

              {approvatoNonPubblicato && (
                <span
                  className="badge"
                  style={{
                    background: `${COLORE_ATTESA}1A`,
                    color: COLORE_ATTESA,
                    flexShrink: 0,
                  }}
                >
                  Non in pagina
                </span>
              )}

              <span
                className="badge"
                style={{ background: `${colore}1A`, color: colore, flexShrink: 0 }}
              >
                {statoMentorLabel(m.stato)}
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
                  gap: 18,
                }}
              >
                {/* ── Decisione ── */}
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
                  {AZIONI.map((a) => (
                    <Button
                      key={a.stato}
                      type="button"
                      variant={a.stato === "approvata" ? "default" : "outline"}
                      disabled={occupato === m.id || m.stato === a.stato}
                      onClick={() => aggiorna(m, { stato: a.stato })}
                      style={{ height: 36, fontSize: 13 }}
                    >
                      {a.label}
                    </Button>
                  ))}

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-light)",
                      flex: "1 1 240px",
                    }}
                  >
                    Note interne
                    <Input
                      key={`nota-${m.id}-${m.note_staff ?? ""}`}
                      defaultValue={m.note_staff ?? ""}
                      placeholder="Non le vede il mentor"
                      disabled={occupato === m.id}
                      onBlur={(e) => {
                        if (e.target.value !== (m.note_staff ?? "")) {
                          aggiorna(m, { note_staff: e.target.value });
                        }
                      }}
                    />
                  </label>

                  {occupato === m.id && (
                    <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
                  )}
                </div>

                {/* Il caso in cui lo staff cerca un errore che non c'e. */}
                {approvatoNonPubblicato && (
                  <div style={NOTA_ATTESA}>
                    Questo mentor è approvato ma <strong>non ha dato il consenso alla
                    pubblicazione</strong>, quindi non compare nella pagina pubblica dei mentor e
                    non deve comparirci. Può seguire una squadra e vederne il progetto come
                    chiunque altro.
                  </div>
                )}

                {/* ── Abbinamento (art. 5) ── */}
                <div>
                  <h3
                    className="font-semibold text-gray-800"
                    style={{ fontSize: 14, marginBottom: 6 }}
                  >
                    Squadre seguite
                  </h3>

                  {seguite.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-light)", margin: "0 0 10px" }}>
                      Nessuna squadra. Finché non ne segue una, questo mentor non vede nessun
                      progetto.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
                      {seguite.map((v, i) => (
                        <div
                          key={v.assegnazione_id}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 0",
                            borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                            opacity: v.stato === "aperta" ? 1 : 0.55,
                          }}
                        >
                          <span style={{ flex: "1 1 200px", minWidth: 0 }}>
                            <span
                              className="block font-semibold text-gray-800"
                              style={{ fontSize: 13.5 }}
                            >
                              {v.nome ?? "(squadra non trovata)"}
                            </span>
                            <span
                              className="block"
                              style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}
                            >
                              {v.codice ? (
                                <span style={{ fontFamily: "monospace" }}>{v.codice}</span>
                              ) : null}
                              {v.stato && v.stato !== "aperta" ? " . squadra sciolta" : ""}
                              {v.nota ? ` . ${v.nota}` : ""}
                            </span>
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                            dal {dataIt(v.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={() => togliAbbinamento(m, v)}
                            disabled={occupato === m.id}
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
                            Togli
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Solo a un mentor approvato: la rotta rifiuta gli altri,
                      perche e l'abbinamento ad aprirgli i progetti del team. */}
                  {m.stato === "approvata" ? (
                    <div className="flex flex-wrap gap-3 items-center">
                      <select
                        value={scelta[m.id] ?? ""}
                        disabled={occupato === m.id || disponibili.length === 0}
                        onChange={(e) => setScelta((p) => ({ ...p, [m.id]: e.target.value }))}
                        style={{ ...selectStyle, flex: "0 1 260px" }}
                      >
                        <option value="">
                          {disponibili.length === 0
                            ? "Nessuna altra squadra aperta"
                            : "Scegli una squadra"}
                        </option>
                        {disponibili.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome} . {s.codice}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Perché questo abbinamento, facoltativo"
                        maxLength={NOTA_ABBINAMENTO_MAX}
                        value={notaAbbinamento[m.id] ?? ""}
                        disabled={occupato === m.id}
                        onChange={(e) =>
                          setNotaAbbinamento((p) => ({ ...p, [m.id]: e.target.value }))
                        }
                        style={{ flex: "1 1 220px" }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={occupato === m.id || !scelta[m.id]}
                        onClick={() => abbina(m)}
                      >
                        Abbina
                      </Button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: 0 }}>
                      Solo un mentor approvato può seguire una squadra: è l&apos;abbinamento che
                      gli apre il progetto del team.
                    </p>
                  )}
                </div>

                {/* ── La candidatura ── */}
                <div>
                  <Riga label="Email">{m.email}</Riga>
                  <Riga label="Telefono">{m.telefono}</Riga>
                  <Riga label="Profilo">{ruoloMentorLabel(m.ruolo)}</Riga>
                  <Riga label="Organizzazione">{m.organizzazione}</Riga>
                  <Riga label="Aree disciplinari">
                    {aree.length > 0 ? aree.map(areaLabel).join(" . ") : ""}
                  </Riga>
                  <Riga label="Presentazione">{m.bio}</Riga>
                  <Riga label="Competenze">{m.competenze}</Riga>
                  <Riga label="Disponibilità">
                    {m.disponibilita ? disponibilitaMentorLabel(m.disponibilita) : ""}
                  </Riga>
                  <Riga label="Sito">
                    {m.sito ? (
                      <a
                        href={m.sito}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--primary-dark)" }}
                      >
                        {m.sito}
                      </a>
                    ) : (
                      ""
                    )}
                  </Riga>
                  <Riga label="LinkedIn">
                    {m.linkedin ? (
                      <a
                        href={m.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--primary-dark)" }}
                      >
                        {m.linkedin}
                      </a>
                    ) : (
                      ""
                    )}
                  </Riga>
                  <Riga label="Consenso alla pubblicazione">
                    {m.consenso_pubblicazione
                      ? "Sì, può comparire nella pagina pubblica"
                      : "No, resta fuori dalla pagina pubblica"}
                  </Riga>
                  <Riga label="Consenso privacy">{m.consenso_privacy ? "Sì" : "No"}</Riga>
                  <Riga label="Origine">
                    {m.origine === "staff" ? "Inserito dallo staff" : "Si è candidato"}
                  </Riga>
                  <Riga label="Account">
                    {m.user_id
                      ? "Collegato"
                      : "Nessun account. Nasce quando la candidatura viene approvata."}
                  </Riga>
                  <Riga label="Note staff">{m.note_staff}</Riga>
                  <Riga label="Candidatura del">{dataIt(m.created_at)}</Riga>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
        Sospendere non è respingere: lascia la candidatura in sospeso senza mandare niente alla
        persona, ed è la strada per chi al momento non ha tempo. Approvare e respingere invece
        scrivono, e lo fanno una volta sola, alla transizione: salvare una nota su una riga già
        decisa non rimanda nessuna email.{" "}
        <span style={{ color: COLORE_SPENTO }}>
          Le squadre sciolte restano visibili negli abbinamenti, smorzate, perché il mentoring
          c&apos;è stato anche se il team non esiste più.
        </span>
      </p>
    </div>
  );
}
