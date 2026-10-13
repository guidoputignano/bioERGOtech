"use client";

/**
 * Docenti del progetto, nella console.
 *
 * `DocentiProgetto` e la scheda del referente principale: chi ha indicato,
 * in che stato, e il modulo per indicarne un altro. `ColleghiDocente` e la
 * riga di un docente del progetto: con chi segue il percorso (solo i nomi)
 * e le classi che segue, che puo correggere.
 *
 * I dati arrivano con la rotta del referente; dopo ogni azione si rileggono
 * dalla rotta dei docenti, che risponde nella stessa forma.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DICHIARAZIONE_INVITO_DOCENTE_TESTO,
  DOCENTI_PROGETTO_MAX,
  RIMANDA_INVITO_MINUTI,
  statoDocenteColore,
  statoDocenteLabel,
} from "../content";
import { normalizzaClasse } from "@/lib/eventi/licei-iscrizioni";
import type { OpzioneClasse } from "./filtroPerClasse";
// Solo i tipi: il modulo e del server.
import type { CollegaVista, DocenteProgettoVista, DocentiRisposta } from "@/lib/eventi/licei-docenti";

const API = "/api/eventi/licei/referente/docenti";

const data = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "";

const ora = (iso: string): string =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const etichettaCampo: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-light)",
};

/** Le classi come le scrive il docente: separate da virgole. */
const classiDaTesto = (t: string): string[] =>
  t
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);

async function chiama(metodo: "POST" | "PATCH", corpo: Record<string, unknown>) {
  const res = await fetch(API, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Operazione non riuscita.");
  return json as Record<string, unknown>;
}

/* ── La scheda del referente principale ─────────────────────────────── */

export function DocentiProgetto({
  iniziale,
  classiPresenti,
}: {
  /** Arriva con la rotta del referente. Null: la scheda lo chiede da sé. */
  iniziale: DocentiRisposta | null;
  /** Le classi degli studenti iscritti, per scegliere quelle seguite. */
  classiPresenti: OpzioneClasse[];
}) {
  const [risposta, setRisposta] = useState<DocentiRisposta | null>(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [formAperto, setFormAperto] = useState(false);
  const [modulo, setModulo] = useState({ nome: "", cognome: "", email: "", classi: "" });
  const [dichiarazione, setDichiarazione] = useState(false);
  const [classiInModifica, setClassiInModifica] = useState<{ id: string; testo: string } | null>(null);

  const ricarica = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Caricamento non riuscito.");
      setRisposta(json as DocentiRisposta);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    }
  }, []);

  // Quando la console ricarica, i dati nuovi arrivano di qui; se la rotta
  // del referente non li ha letti, la scheda li chiede alla sua.
  useEffect(() => {
    if (iniziale) setRisposta(iniziale);
    else ricarica();
  }, [iniziale, ricarica]);

  const elenco = useMemo<DocenteProgettoVista[]>(() => {
    if (!risposta?.disponibile || risposta.ruolo !== "referente") return [];
    // I revocati in fondo: restano visibili come registro, ma non in mezzo.
    return [...risposta.docenti].sort(
      (a, b) => Number(a.stato === "revocato") - Number(b.stato === "revocato"),
    );
  }, [risposta]);

  const nonRevocati = elenco.filter((d) => d.stato !== "revocato").length;
  const max = risposta?.disponibile && risposta.ruolo === "referente" ? risposta.max : DOCENTI_PROGETTO_MAX;
  const puoInvitare = risposta?.disponibile && risposta.ruolo === "referente" && risposta.puo_invitare;

  const azione = async (id: string, corpo: Record<string, unknown>, fatto: string): Promise<boolean> => {
    setInCorso(id);
    setErrore(null);
    setAvviso(null);
    try {
      await chiama("PATCH", { id, ...corpo });
      setAvviso(fatto);
      await ricarica();
      return true;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return false;
    } finally {
      setInCorso(null);
    }
  };

  const revoca = (d: DocenteProgettoVista) => {
    if (
      !window.confirm(
        `Revocare l'accesso di ${d.nome} ${d.cognome}? Da subito non vedrà più i dati degli studenti.`,
      )
    ) {
      return;
    }
    azione(d.id, { azione: "revoca" }, `Accesso di ${d.nome} ${d.cognome} revocato.`);
  };

  const invita = async (e: React.FormEvent) => {
    e.preventDefault();
    setInCorso("invito");
    setErrore(null);
    setAvviso(null);
    try {
      const esito = await chiama("POST", {
        nome: modulo.nome,
        cognome: modulo.cognome,
        email: modulo.email,
        classi: classiDaTesto(modulo.classi),
        dichiarazione,
      });
      // L'avviso alla scuola si conferma solo se e partito: e quello che
      // l'informativa promette all'istituto.
      const avvisoScuola =
        esito.avviso_istituto === true
          ? "L'istituto riceve un avviso al suo indirizzo istituzionale."
          : "L'avviso all'indirizzo istituzionale della scuola non è partito: lo segnali a info@bioergotech.org e lo inoltriamo noi.";
      setAvviso(
        esito.email_inviata
          ? `Invito inviato a ${modulo.email.trim()}. ${avvisoScuola}`
          : `Il docente è registrato, ma l'email non è partita. Riprovi fra qualche minuto con «Rimanda invito». ${avvisoScuola}`,
      );
      setModulo({ nome: "", cognome: "", email: "", classi: "" });
      setDichiarazione(false);
      setFormAperto(false);
      await ricarica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Invito non riuscito.");
    } finally {
      setInCorso(null);
    }
  };

  // Le classi scelte nel modulo, normalizzate: servono a accendere i
  // bottoni delle classi presenti.
  const sceltePerChiave = new Set(classiDaTesto(modulo.classi).map((c) => normalizzaClasse(c)));
  const alternaClasse = (o: OpzioneClasse) => {
    const attuali = classiDaTesto(modulo.classi);
    const nuove = sceltePerChiave.has(o.valore)
      ? attuali.filter((c) => normalizzaClasse(c) !== o.valore)
      : [...attuali, o.etichetta];
    setModulo((m) => ({ ...m, classi: nuove.join(", ") }));
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="flex items-center flex-wrap gap-3" style={{ marginBottom: 4 }}>
        <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: 0 }}>
          Docenti del progetto
        </h2>
        {risposta?.disponibile && (
          <span className="badge badge-primary">
            {nonRevocati} su {max}
          </span>
        )}
      </div>

      {!risposta && !errore && <p className="text-sm text-gray-600">Caricamento…</p>}

      {risposta && !risposta.disponibile && (
        <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
          <strong>Funzione in attivazione.</strong> Fra poco potrà indicare qui fino a{" "}
          {DOCENTI_PROGETTO_MAX} colleghi dell&apos;istituto che seguono il percorso insieme a lei.
        </p>
      )}

      {risposta?.disponibile && (
        <>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 14 }}>
            Può indicare fino a {max} colleghi dell&apos;istituto che seguono gli studenti del
            percorso. Ognuno riceve un accesso personale e, dopo aver accettato le istruzioni, vede
            tutti gli studenti dell&apos;istituto: può confermare le iscrizioni e rimandare i link di
            accesso, ma non indicare altri docenti né scaricare gli elenchi. A ogni nuovo docente
            l&apos;istituto riceve un avviso al suo indirizzo istituzionale.
          </p>

          {elenco.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
              {elenco.map((d, i) => {
                const revocato = d.stato === "revocato";
                const attesa = d.rimanda_dal && new Date(d.rimanda_dal).getTime() > Date.now();
                return (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 0",
                      borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                      opacity: revocato ? 0.7 : 1,
                    }}
                  >
                    <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <div className="font-semibold text-gray-800" style={{ fontSize: 14 }}>
                        {d.cognome} {d.nome}
                      </div>
                      <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2, overflowWrap: "anywhere" }}>
                        {d.email}
                        {d.classi.length > 0 ? ` . classi ${d.classi.join(", ")}` : " . nessuna classe indicata"}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-light)", marginTop: 2 }}>
                        {revocato
                          ? `Revocato il ${data(d.revocato_at)}`
                          : d.stato === "attivo"
                            ? d.istruzioni_accettate_at
                              ? `Istruzioni accettate il ${data(d.istruzioni_accettate_at)}`
                              : "Deve accettare la nuova versione delle istruzioni al prossimo accesso"
                            : `Invitato il ${data(d.invitato_at)}, non ha ancora accettato le istruzioni`}
                      </div>

                      {classiInModifica?.id === d.id && (
                        <div className="flex flex-wrap gap-2 items-center" style={{ marginTop: 8 }}>
                          <Input
                            value={classiInModifica.testo}
                            onChange={(e) => setClassiInModifica({ id: d.id, testo: e.target.value })}
                            placeholder="Es. 4A, 5B"
                            style={{ flex: "1 1 160px", height: 32, fontSize: 13 }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={inCorso === d.id}
                            onClick={async () => {
                              const fatto = await azione(
                                d.id,
                                { azione: "classi", classi: classiDaTesto(classiInModifica.testo) },
                                "Classi aggiornate.",
                              );
                              if (fatto) setClassiInModifica(null);
                            }}
                          >
                            Salva
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setClassiInModifica(null)}>
                            Annulla
                          </Button>
                        </div>
                      )}
                    </div>

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

                    {!revocato && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                        {classiInModifica?.id !== d.id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setClassiInModifica({ id: d.id, testo: d.classi.join(", ") })}
                          >
                            Classi
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={inCorso === d.id || !!attesa}
                          title={
                            attesa
                              ? `L'invito è partito da poco: si può rimandare dalle ${ora(d.rimanda_dal as string)}.`
                              : "Manda di nuovo l'email con il link di accesso."
                          }
                          onClick={() =>
                            azione(d.id, { azione: "rimanda_invito" }, `Invito rimandato a ${d.email}.`)
                          }
                        >
                          Rimanda invito
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={inCorso === d.id}
                          onClick={() => revoca(d)}
                          style={{ color: "#B44A5E" }}
                        >
                          Revoca
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {avviso && (
            <p style={{ color: "var(--primary-dark)", fontSize: 13.5, margin: "0 0 12px" }}>{avviso}</p>
          )}

          {!puoInvitare ? (
            <p className="text-sm text-gray-600" style={{ margin: 0 }}>
              Potrà indicare altri docenti quando l&apos;adesione del vostro istituto sarà confermata.
            </p>
          ) : nonRevocati >= max ? (
            <p className="text-sm text-gray-600" style={{ margin: 0 }}>
              Ha raggiunto il massimo di {max} docenti del progetto. Per indicarne un altro revochi
              prima l&apos;accesso di uno di loro.
            </p>
          ) : !formAperto ? (
            <Button type="button" variant="outline" onClick={() => setFormAperto(true)}>
              <i className="fas fa-user-plus" style={{ marginRight: 4 }} />
              Indica un docente
            </Button>
          ) : (
            <form
              onSubmit={invita}
              style={{
                background: "var(--bg-light)",
                borderRadius: 12,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label style={etichettaCampo}>
                  Nome
                  <Input
                    value={modulo.nome}
                    onChange={(e) => setModulo((m) => ({ ...m, nome: e.target.value }))}
                    required
                    maxLength={80}
                  />
                </label>
                <label style={etichettaCampo}>
                  Cognome
                  <Input
                    value={modulo.cognome}
                    onChange={(e) => setModulo((m) => ({ ...m, cognome: e.target.value }))}
                    required
                    maxLength={80}
                  />
                </label>
                <label style={etichettaCampo}>
                  Email
                  <Input
                    type="email"
                    value={modulo.email}
                    onChange={(e) => setModulo((m) => ({ ...m, email: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <label style={etichettaCampo}>
                Classi che segue (facoltativo)
                <Input
                  value={modulo.classi}
                  onChange={(e) => setModulo((m) => ({ ...m, classi: e.target.value }))}
                  placeholder="Es. 4A, 5B"
                />
              </label>
              {classiPresenti.length > 0 && (
                <div className="flex flex-wrap gap-2" style={{ marginTop: -4 }}>
                  {classiPresenti.map((o) => {
                    const scelta = sceltePerChiave.has(o.valore);
                    return (
                      <button
                        key={o.valore}
                        type="button"
                        onClick={() => alternaClasse(o)}
                        className="badge"
                        aria-pressed={scelta}
                        style={{
                          cursor: "pointer",
                          border: `1.5px solid ${scelta ? "var(--primary)" : "var(--border-color)"}`,
                          background: scelta ? "var(--primary-light)" : "#fff",
                          color: scelta ? "var(--primary-dark)" : "var(--text-mid)",
                        }}
                      >
                        {o.etichetta}
                      </button>
                    );
                  })}
                </div>
              )}
              <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, margin: 0 }}>
                Le classi sono solo il filtro da cui il docente parte: vede comunque tutti gli
                studenti dell&apos;istituto.
              </p>

              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  fontSize: 13.5,
                  color: "var(--text-dark)",
                  lineHeight: 1.6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={dichiarazione}
                  onChange={(e) => setDichiarazione(e.target.checked)}
                  style={{ marginTop: 4, width: 16, height: 16, flexShrink: 0, accentColor: "var(--primary)" }}
                />
                <span>{DICHIARAZIONE_INVITO_DOCENTE_TESTO}</span>
              </label>

              <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, margin: 0 }}>
                Il docente riceve un&apos;email con il link di accesso; al primo accesso accetta le
                istruzioni. All&apos;indirizzo istituzionale della scuola arriva un avviso, con copia
                alla Fondazione. L&apos;invito si può rimandare una volta ogni {RIMANDA_INVITO_MINUTI}{" "}
                minuti.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!dichiarazione || inCorso === "invito"}>
                  {inCorso === "invito" ? "Invio…" : "Invia l'invito"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormAperto(false);
                    setDichiarazione(false);
                  }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          )}
        </>
      )}

      {errore && <p style={{ color: "#E74C6F", fontSize: 13.5, margin: "12px 0 0" }}>{errore}</p>}
    </div>
  );
}

/* ── La riga di un docente del progetto ──────────────────────────────── */

export function ColleghiDocente({
  referente,
  colleghi,
  io,
  onClassiCambiate,
}: {
  /** Nome e cognome del referente principale. */
  referente: string;
  colleghi: CollegaVista[];
  io: { id: string | null; classi: string[] };
  /** Dopo il salvataggio: la console aggiorna "Le mie classi" del filtro. */
  onClassiCambiate: (classi: string[]) => void;
}) {
  const [testo, setTesto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const salva = async () => {
    if (!io.id || testo === null) return;
    setSalvando(true);
    setErrore(null);
    try {
      const esito = await chiama("PATCH", { id: io.id, azione: "classi", classi: classiDaTesto(testo) });
      onClassiCambiate((esito.classi as string[] | undefined) ?? classiDaTesto(testo));
      setTesto(null);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSalvando(false);
    }
  };

  const nomi = colleghi.map((c) => `${c.nome} ${c.cognome}`);

  return (
    <div className="card-sm" style={{ padding: 16, fontSize: 13.5, color: "var(--text-mid)", lineHeight: 1.7 }}>
      <div>
        Seguono il percorso con lei: <strong>{referente}</strong>, docente referente
        {nomi.length > 0 ? `, e ${nomi.join(", ")}` : ""}.
      </div>
      <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 6 }}>
        <span>
          Le sue classi: {io.classi.length > 0 ? <strong>{io.classi.join(", ")}</strong> : "nessuna indicata"}.
        </span>
        {io.id && testo === null && (
          <Button type="button" size="sm" variant="outline" onClick={() => setTesto(io.classi.join(", "))}>
            Modifica
          </Button>
        )}
        {testo !== null && (
          <>
            <Input
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="Es. 4A, 5B"
              style={{ flex: "1 1 160px", maxWidth: 260, height: 32, fontSize: 13 }}
            />
            <Button type="button" size="sm" onClick={salva} disabled={salvando}>
              Salva
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setTesto(null)}>
              Annulla
            </Button>
          </>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>
        Le classi sono il filtro da cui parte l&apos;elenco: può sempre passare a tutte le classi
        dell&apos;istituto.
      </div>
      {errore && <p style={{ color: "#E74C6F", fontSize: 13, margin: "6px 0 0" }}>{errore}</p>}
    </div>
  );
}
