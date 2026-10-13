"use client";

/**
 * Il quadro delle squadre, nella console del referente e dei docenti del
 * progetto.
 *
 * Quali squadre si sono formate, con chi, a che punto e il progetto, e chi
 * dei confermati e ancora fuori. In sola lettura: le squadre le formano gli
 * studenti, e da qui non si sposta nessuno. Niente export: il quadro si
 * guarda a schermo, e un file in piu con i nomi di minorenni e una copia in
 * piu da custodire.
 *
 * Il calcolo e `quadroSquadre` (lib/eventi/licei-squadre.ts), sui dati che
 * la console ha gia. Il filtro per classe e lo stesso dell'elenco: lo tiene
 * la console, e la select qui ripete quella in alto per non dover risalire
 * la pagina.
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SQUADRA_MAX, SQUADRA_MIN, statoIscrizioneLabel } from "../content";
import {
  quadroSquadre,
  type ComponenteQuadro,
  type IscrizioneQuadroInput,
  type SquadraQuadroInput,
  type StatoSquadraQuadro,
} from "@/lib/eventi/licei-squadre";
import type { FiltroClassi } from "./filtroPerClasse";

const giornoMese = (iso: string): string =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });

const ora = (iso: string): string =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

const STATI_SQUADRA: Record<StatoSquadraQuadro, { label: string; colore: string }> = {
  sotto_minimo: { label: `Serve almeno ${SQUADRA_MIN} componenti`, colore: "#B44A5E" },
  bozza: { label: "Progetto in bozza", colore: "#8A6100" },
  consegnato: { label: "Progetto consegnato", colore: "#0A7A66" },
  finalista: { label: "Finalista", colore: "#1A9E92" },
  ritirato: { label: "Progetto ritirato", colore: "#8896A6" },
};

/** Un badge piu piccolo, per stare sulla riga di un nome. */
const badgePiccolo: React.CSSProperties = { fontSize: 10.5, padding: "2px 8px", flexShrink: 0 };

const riquadroNumero: React.CSSProperties = {
  background: "var(--bg-light)",
  borderRadius: 10,
  padding: "12px 14px",
  minWidth: 0,
};

function Numero({
  valore,
  etichetta,
  colore,
}: {
  valore: React.ReactNode;
  etichetta: string;
  colore?: string;
}) {
  return (
    <div style={riquadroNumero}>
      <div className="stat-number" style={{ fontSize: 24, color: colore }}>
        {valore}
      </div>
      <div className="stat-label" style={{ fontSize: 12.5 }}>
        {etichetta}
      </div>
    </div>
  );
}

function RigaComponente({ c }: { c: ComponenteQuadro }) {
  return (
    <li style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ minWidth: 0, overflowWrap: "anywhere", color: "var(--text-dark)" }}>
        {c.altroIstituto ? (
          <em style={{ color: "var(--text-light)" }}>Studente di altro istituto</em>
        ) : (
          <>
            {c.cognome} {c.nome}
            {c.classe && <span style={{ color: "var(--text-light)" }}> . {c.classe}</span>}
          </>
        )}
      </span>
      {c.capitano && (
        <span className="badge badge-primary" style={badgePiccolo}>
          Capitano
        </span>
      )}
      {!c.altroIstituto && !c.confermata && (
        <span
          className="badge"
          style={{ ...badgePiccolo, background: "#8A61001A", color: "#8A6100" }}
          title={`Stato dell'iscrizione: ${statoIscrizioneLabel(c.stato)}. Resta collegato alla squadra: se non è corretto, ce lo segnali a info@bioergotech.org.`}
        >
          Iscrizione non confermata
        </span>
      )}
    </li>
  );
}

export function QuadroSquadre({
  iscrizioni,
  squadre,
  componentiAltriIstituti,
  adesioneId,
  filtro,
  selettoreClasse,
  totaleLezioni,
  fasi,
  erroreLettura,
  aggiornatoAlle,
  aggiornando,
  onAggiorna,
}: {
  /** Le iscrizioni dell'istituto, come le manda la rotta del referente. */
  iscrizioni: IscrizioneQuadroInput[];
  squadre: SquadraQuadroInput[];
  /** Componenti di altri istituti, senza nome ne classe: oggi sempre vuoto. */
  componentiAltriIstituti: IscrizioneQuadroInput[];
  adesioneId: string;
  /** Il filtro per classe della console, lo stesso dell'elenco. */
  filtro: FiltroClassi;
  /** La select del filtro, legata allo stesso stato di quella in alto. */
  selettoreClasse?: React.ReactNode;
  totaleLezioni: number;
  /** Le fasi del percorso. Null: si mostra il quadro. */
  fasi: { squadre: string } | null;
  /** Vero se la rotta non e riuscita a leggere le squadre. */
  erroreLettura: boolean;
  /** Quando sono arrivati i dati, in ISO. */
  aggiornatoAlle: string | null;
  aggiornando: boolean;
  /** Ricarica i dati della console. Torna il messaggio d'errore, o null. */
  onAggiorna: () => Promise<string | null>;
}) {
  const [erroreAggiorna, setErroreAggiorna] = useState<string | null>(null);

  const quadro = useMemo(
    () =>
      quadroSquadre([...iscrizioni, ...componentiAltriIstituti], squadre, adesioneId, {
        classi: filtro.chiavi,
      }),
    [iscrizioni, componentiAltriIstituti, squadre, adesioneId, filtro.chiavi],
  );

  // Prima della fase delle squadre, e senza squadre, una riga sola: una
  // sezione vuota direbbe al docente che manca qualcosa.
  if (fasi !== null && fasi.squadre !== "aperte" && squadre.length === 0 && !erroreLettura) {
    return (
      <p className="text-sm text-gray-600" style={{ margin: 0 }}>
        La formazione delle squadre non è ancora aperta.
      </p>
    );
  }

  const aggiorna = async () => {
    setErroreAggiorna(null);
    setErroreAggiorna(await onAggiorna());
  };

  const n = quadro.numeri;
  const totaleSenza = quadro.senzaSquadra.reduce((s, g) => s + g.studenti.length, 0);

  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        className="flex flex-wrap items-center gap-3"
        style={{ justifyContent: "space-between", marginBottom: 4 }}
      >
        <h2 className="font-semibold text-gray-800" style={{ fontSize: 15, margin: 0 }}>
          Le squadre del vostro istituto
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {aggiornatoAlle && (
            <span style={{ fontSize: 12, color: "var(--text-light)" }}>
              Aggiornato alle {ora(aggiornatoAlle)}
            </span>
          )}
          <Button type="button" size="sm" variant="outline" disabled={aggiornando} onClick={aggiorna}>
            <i className="fas fa-rotate-right" style={{ marginRight: 4 }} />
            {aggiornando ? "Aggiorno…" : "Aggiorna"}
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, marginBottom: 12 }}>
        Le squadre le formano gli studenti, poco per volta: qui si seguono, senza modificarle.
        Per vedere le ultime novità usi «Aggiorna».
      </p>

      {erroreAggiorna && (
        <p style={{ color: "#E74C6F", fontSize: 13.5, margin: "0 0 12px" }}>
          Aggiornamento non riuscito: {erroreAggiorna}
        </p>
      )}

      {selettoreClasse && (
        <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 12 }}>
          {selettoreClasse}
          <span style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.6 }}>
            {filtro.chiavi === null
              ? "Numeri e squadre riguardano tutto l'istituto."
              : `Numeri e squadre riguardano: ${filtro.etichetta}. Compare ogni squadra con almeno un componente di queste classi, con tutti i suoi componenti.`}
          </span>
        </div>
      )}

      {erroreLettura ? (
        <p className="text-sm" style={{ color: "#B44A5E", lineHeight: 1.7, margin: "0 0 12px" }}>
          Non è stato possibile leggere le squadre. Riprovi fra poco con «Aggiorna».
        </p>
      ) : (
        <>
          {/* ── I numeri ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 16 }}>
            <Numero valore={n.squadre} etichetta="Squadre formate" />
            <Numero
              valore={
                <>
                  {n.inSquadra}
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-light)" }}>
                    {" "}
                    su {n.confermati}
                  </span>
                </>
              }
              etichetta="Studenti confermati in squadra"
            />
            <Numero
              valore={n.senzaSquadra}
              etichetta="Confermati senza squadra"
              colore={n.senzaSquadra > 0 ? "#8A6100" : undefined}
            />
            <Numero
              valore={n.sottoMinimo}
              etichetta={`Squadre sotto il minimo di ${SQUADRA_MIN}`}
              colore={n.sottoMinimo > 0 ? "#8A6100" : undefined}
            />
          </div>

          {/* ── Le squadre ── */}
          {quadro.squadre.length === 0 ? (
            <p className="text-sm text-gray-600" style={{ margin: "0 0 16px" }}>
              {squadre.length === 0
                ? "Non si è ancora formata nessuna squadra."
                : "Nessuna squadra ha componenti delle classi scelte."}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
              {quadro.squadre.map((s) => {
                const stato = STATI_SQUADRA[s.stato];
                const componenti = s.capitano ? [s.capitano, ...s.membri] : s.membri;
                return (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid var(--border-color)",
                      borderRadius: 12,
                      padding: 14,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                        <div
                          className="font-semibold text-gray-800"
                          style={{ fontSize: 14.5, overflowWrap: "anywhere" }}
                        >
                          {s.nome}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                          {s.created_at ? `formata il ${giornoMese(s.created_at)} . ` : ""}
                          {s.n} su {SQUADRA_MAX}
                        </div>
                      </div>
                      <span
                        className="badge"
                        style={{ background: `${stato.colore}1A`, color: stato.colore, flexShrink: 0 }}
                      >
                        {stato.label}
                      </span>
                    </div>

                    {s.progetto?.titolo && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-mid)",
                          marginTop: 8,
                          overflowWrap: "anywhere",
                        }}
                      >
                        Progetto: «{s.progetto.titolo}»
                      </div>
                    )}

                    {componenti.length > 0 ? (
                      <ul
                        style={{
                          listStyle: "none",
                          margin: "10px 0 0",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {componenti.map((c, i) => (
                          <RigaComponente key={c.altroIstituto ? `altro-${i}` : c.id || `c-${i}`} c={c} />
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: 12.5, color: "var(--text-light)", margin: "10px 0 0" }}>
                        Nessun componente.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Chi e ancora fuori ── */}
          <div style={{ background: "var(--bg-light)", borderRadius: 12, padding: 14 }}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-800" style={{ fontSize: 14, margin: 0 }}>
                Non ancora in una squadra
              </h3>
              {totaleSenza > 0 && <span className="badge badge-primary">{totaleSenza}</span>}
            </div>

            {totaleSenza === 0 ? (
              <p className="text-sm text-gray-600" style={{ margin: "6px 0 0" }}>
                {n.confermati === 0
                  ? "Non ci sono ancora studenti confermati."
                  : "Tutti gli studenti confermati sono in una squadra."}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "6px 0 0" }}>
                  Studenti confermati che non sono ancora entrati in una squadra. Spesso chi è senza
                  squadra è anche fermo nel corso: accanto al nome, a che punto è.
                </p>
                {quadro.senzaSquadra.map((g) => (
                  <div key={g.chiave || "_"} style={{ marginTop: 12 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-light)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {g.chiave ? `Classe ${g.etichetta}` : "Classe non indicata"} ({g.studenti.length})
                    </div>
                    <ul
                      className="grid grid-cols-1 sm:grid-cols-2 gap-x-6"
                      style={{ listStyle: "none", margin: "4px 0 0", padding: 0 }}
                    >
                      {g.studenti.map((st) => (
                        <li
                          key={st.id}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 6,
                            padding: "6px 0",
                            borderTop: "1px solid var(--border-color)",
                            fontSize: 13,
                            minWidth: 0,
                          }}
                        >
                          <span style={{ minWidth: 0, overflowWrap: "anywhere", color: "var(--text-dark)" }}>
                            {st.cognome} {st.nome}
                          </span>
                          {st.maiEntrato ? (
                            <span
                              className="badge"
                              style={{ ...badgePiccolo, background: "#B44A5E1A", color: "#B44A5E" }}
                              title="Non è mai entrato nel corso. Dall'elenco qui sopra può rimandargli il link di accesso."
                            >
                              Mai entrato
                            </span>
                          ) : totaleLezioni > 0 ? (
                            <span
                              style={{
                                fontSize: 12,
                                flexShrink: 0,
                                color: st.lezioniCompletate > 0 ? "var(--text-light)" : "#8A6100",
                              }}
                            >
                              {st.lezioniCompletate}/{totaleLezioni} lezioni
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}

            {quadro.inAttesa > 0 && (
              <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "12px 0 0" }}>
                {quadro.inAttesa === 1
                  ? "Uno studente è ancora in attesa di conferma: potrà entrare in una squadra dopo la conferma, dall'elenco qui sopra."
                  : `${quadro.inAttesa} studenti sono ancora in attesa di conferma: potranno entrare in una squadra dopo la conferma, dall'elenco qui sopra.`}
              </p>
            )}
          </div>
        </>
      )}

      <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: "14px 0 0" }}>
        Il quadro serve al monitoraggio del percorso. Non va proiettato in classe né condiviso.
      </p>
    </div>
  );
}
