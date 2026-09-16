"use client";

/**
 * Squadre, progetti e classifica, visti dallo staff.
 *
 * Lo staff legge la classifica ma non la fa. I punteggi arrivano dalle
 * schede della Commissione, e qui si possono solo guardare: l'art. 7 dice
 * come si ordina e l'art. 8 dice chi vota, e nessuna delle due cose e una
 * decisione di questa schermata.
 *
 * Il numero di atenei diversi sta accanto a ogni squadra e non in fondo a
 * una colonna qualsiasi. L'art. 2 incoraggia espressamente i team fra
 * atenei e fra discipline, e l'art. 4 dice che a parita di tutto il resto
 * saranno favoriti i gruppi con competenze complementari: senza quel numero
 * in schermata nessuno saprebbe se e successo davvero, e la riga del bando
 * resterebbe un augurio.
 *
 * I componenti si ricavano dalle candidature gia caricate e non da una
 * lettura in piu. `universita_candidature` e l'unica tabella che sa chi sta
 * dove, la rotta ne ha gia contato il numero per ogni squadra, e ricomporre
 * qui l'elenco dei nomi con la stessa fonte evita che il conteggio in cima
 * e i nomi sotto possano dissentire.
 */

import { useMemo, useState } from "react";
import {
  AMBITI_PROGETTO,
  SQUADRA_MAX,
  SQUADRA_MIN,
  ambitoLabel,
  areaLabel,
  statoProgettoColoreUniversita,
  statoProgettoLabelUniversita,
} from "../content";

// Le righe arrivano dalle tabelle e dalla RPC cosi come sono: le colonne le
// decide la migrazione, e un secondo elenco qui sarebbe il posto che nessuno
// aggiorna.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/admin";

const NOTA_ATTESA: React.CSSProperties = {
  background: "#FFF8E6",
  border: "1px solid #F0D89B",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "#75570F",
  lineHeight: 1.6,
};

const COLORE_CONSEGNATO = statoProgettoColoreUniversita("consegnato");
const COLORE_BOZZA = statoProgettoColoreUniversita("bozza");
const COLORE_SPENTO = statoProgettoColoreUniversita("ritirato");

const dataIt = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "";

/** Una media della RPC, che puo essere nulla finche nessuno ha chiuso una scheda. */
const media = (v: unknown): string => {
  if (v === null || v === undefined) return ".";
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : ".";
};

const conta = (n: number, uno: string, molti: string): string =>
  `${n} ${n === 1 ? uno : molti}`;

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

function Badge({ colore, children }: { colore: string; children: React.ReactNode }) {
  return (
    <span
      className="badge"
      style={{ background: `${colore}1A`, color: colore, flexShrink: 0 }}
    >
      {children}
    </span>
  );
}

export function SquadrePanel({
  squadre,
  progetti,
  classifica,
  candidature,
}: {
  squadre: Qualsiasi[];
  progetti: Qualsiasi[];
  classifica: Qualsiasi[];
  candidature: Qualsiasi[];
}) {
  const [vista, setVista] = useState<"classifica" | "squadre">("classifica");
  const [aperto, setAperto] = useState<string | null>(null);

  // Chi sta in quale squadra, dalla sola tabella che lo sa.
  const membriPerSquadra = useMemo(() => {
    const mappa = new Map<string, Qualsiasi[]>();
    for (const c of candidature) {
      if (!c.squadra_id) continue;
      const elenco = mappa.get(c.squadra_id) ?? [];
      elenco.push(c);
      mappa.set(c.squadra_id, elenco);
    }
    // Il capitano per primo, poi in ordine alfabetico: e l'ordine in cui si
    // legge un gruppo, e il capitano e la persona a cui si scrive.
    for (const elenco of mappa.values()) {
      elenco.sort((a, b) => {
        if (a.squadra_ruolo === "capo") return -1;
        if (b.squadra_ruolo === "capo") return 1;
        return String(a.cognome).localeCompare(String(b.cognome), "it");
      });
    }
    return mappa;
  }, [candidature]);

  const progettoPerId = useMemo(
    () => new Map(progetti.map((p) => [p.id, p])),
    [progetti],
  );

  const squadraPerId = useMemo(() => new Map(squadre.map((s) => [s.id, s])), [squadre]);

  const riepilogo = useMemo(() => {
    const aperte = squadre.filter((s) => s.stato === "aperta");
    return {
      aperte: aperte.length,
      interAteneo: aperte.filter((s) => (s.atenei?.length ?? 0) > 1).length,
      sottoIlMinimo: aperte.filter((s) => (s.componenti ?? 0) < SQUADRA_MIN).length,
      consegnati: progetti.filter((p) => p.stato === "consegnato").length,
      vincitori: progetti.filter((p) => p.vincitore).length,
    };
  }, [squadre, progetti]);

  /** L'elenco dei componenti di una squadra, con ateneo e area. */
  const elencoMembri = (squadraId: string): string => {
    const membri = membriPerSquadra.get(squadraId) ?? [];
    return membri
      .map(
        (m) =>
          `${m.cognome} ${m.nome} (${m.universita}, ${areaLabel(m.area)}${m.squadra_ruolo === "capo" ? ", capitano" : ""})`,
      )
      .join(" . ");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Squadre e progetti</h1>
          <p className="text-sm text-gray-600">
            Art. 2 sui team interdisciplinari, art. 7 sui criteri . da {SQUADRA_MIN} a{" "}
            {SQUADRA_MAX} componenti
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${ROTTA}/export?cosa=squadre`} className="btn-primary" style={{ fontSize: 13 }}>
            <i className="fas fa-file-csv" style={{ marginRight: 8 }} />
            Squadre
          </a>
          <a href={`${ROTTA}/export?cosa=progetti`} className="btn-outline" style={{ fontSize: 13 }}>
            Progetti
          </a>
          {/* I sei campi dell'art. 7 stanno fuori dal file di base perche un
              foglio con sei colonne da millecinquecento caratteri non si
              legge. Chi deve leggerli davvero scarica questo. */}
          <a
            href={`${ROTTA}/export?cosa=progetti&testi=1`}
            className="btn-outline"
            style={{ fontSize: 13 }}
          >
            Progetti con i testi
          </a>
        </div>
      </div>

      {/* ── Conteggi ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>
            {riepilogo.aperte}
          </div>
          <div className="stat-label">Squadre aperte</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: COLORE_CONSEGNATO }}>
            {riepilogo.interAteneo}
          </div>
          <div className="stat-label">Su più atenei</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: COLORE_BOZZA }}>
            {riepilogo.sottoIlMinimo}
          </div>
          <div className="stat-label">Sotto i {SQUADRA_MIN} componenti</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>
            {riepilogo.consegnati}
          </div>
          <div className="stat-label">Progetti consegnati</div>
        </div>
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26, color: COLORE_CONSEGNATO }}>
            {riepilogo.vincitori}
          </div>
          <div className="stat-label">Designati vincitori</div>
        </div>
      </div>

      {/* Una squadra con una persona sola non e un errore: nasce cosi, il
          giorno in cui il fondatore la crea. Diventa un problema solo vicino
          alla consegna, ed e allora che questo numero serve. */}
      {riepilogo.sottoIlMinimo > 0 && (
        <div style={NOTA_ATTESA}>
          {conta(riepilogo.sottoIlMinimo, "squadra aperta ha", "squadre aperte hanno")} meno di{" "}
          {SQUADRA_MIN} componenti e non potrà consegnare. Finché la formazione delle squadre è
          aperta è normale, perché una squadra nasce con il suo fondatore. Vicino al termine
          diventa la cosa da guardare per prima, insieme alla bacheca.
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
            {v === "classifica"
              ? `Classifica (${classifica.length})`
              : `Squadre (${squadre.length})`}
          </button>
        ))}
        <span style={{ fontSize: 12, color: "var(--text-light)", marginLeft: "auto" }}>
          In classifica entrano solo i progetti consegnati, con le sole schede chiuse
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
              const espanso = aperto === r.progetto_id;
              const progetto = progettoPerId.get(r.progetto_id);
              const squadra = squadraPerId.get(r.squadra_id);
              const atenei = Number(r.atenei ?? 0);
              return (
                <div
                  key={r.progetto_id}
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                    // Lo stesso verde delle etichette, al 5 per cento: la
                    // riga del vincitore si distingue senza introdurre un
                    // colore che non esista gia nel modulo.
                    background: r.vincitore ? `${COLORE_CONSEGNATO}0D` : "transparent",
                  }}
                >
                  {/* Leggere un progetto lo apre qui dentro invece di portare
                      altrove: la classifica e il contesto in cui quel testo
                      si legge, e perderla per tornarci dopo significa
                      rileggere dieci righe per ritrovare il punto. */}
                  <button
                    type="button"
                    onClick={() => setAperto(espanso ? null : r.progetto_id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        fontSize: 15,
                        fontWeight: 800,
                        color: i < 3 ? COLORE_CONSEGNATO : "var(--text-light)",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>

                    <span style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <span className="block font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                        {r.titolo || "(senza titolo)"}
                      </span>
                      <span className="block text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {r.squadra_nome} . {conta(Number(r.componenti ?? 0), "componente", "componenti")}
                        {r.ambito ? ` . ${ambitoLabel(r.ambito)}` : ""}
                      </span>
                      {(r.vincitore || r.posizione) && (
                        <span style={{ display: "inline-block", marginTop: 5 }}>
                          <Badge colore={COLORE_CONSEGNATO}>
                            {r.vincitore ? "Vincitore" : `Posizione ${r.posizione}`}
                          </Badge>
                        </span>
                      )}
                    </span>

                    {/* Gli atenei diversi: l'art. 2 li incoraggia, e questo e
                        il punto in cui si vede se il bando ha funzionato. */}
                    <Badge colore={atenei > 1 ? COLORE_CONSEGNATO : COLORE_SPENTO}>
                      {conta(atenei, "ateneo", "atenei")}
                    </Badge>

                    <span style={{ textAlign: "right", flexShrink: 0, minWidth: 92 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 17,
                          fontWeight: 800,
                          color: "var(--text-dark)",
                        }}
                      >
                        {media(r.media_totale)}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11.5,
                          color: Number(r.schede ?? 0) === 0 ? COLORE_BOZZA : "var(--text-light)",
                        }}
                      >
                        {conta(Number(r.schede ?? 0), "scheda chiusa", "schede chiuse")}
                      </span>
                    </span>

                    <i
                      className={`fas fa-chevron-${espanso ? "up" : "down"} text-sm`}
                      style={{ color: "var(--text-light)", flexShrink: 0 }}
                      aria-hidden="true"
                    />
                  </button>

                  {espanso && (
                    <div style={{ padding: "0 18px 18px" }}>
                      <Riga label="Squadra">
                        {`${r.squadra_nome ?? "(senza nome)"}${squadra?.codice ? ` . codice ${squadra.codice}` : ""}`}
                      </Riga>
                      <Riga label="Componenti">{elencoMembri(r.squadra_id)}</Riga>
                      <Riga label="Atenei">
                        {squadra?.atenei?.length ? squadra.atenei.join(" . ") : ""}
                      </Riga>
                      <Riga label="Ambito">{r.ambito ? ambitoLabel(r.ambito) : ""}</Riga>
                      <Riga label="Punteggio">
                        {`${media(r.media_totale)} di media su ${conta(Number(r.schede ?? 0), "scheda chiusa", "schede chiuse")} . innovatività ${media(r.media_innovativita)}`}
                      </Riga>
                      <Riga label="Materiali">
                        {progetto?.link_materiali ? (
                          <a
                            href={progetto.link_materiali}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--primary-dark)" }}
                          >
                            {progetto.link_materiali}
                          </a>
                        ) : (
                          ""
                        )}
                      </Riga>
                      <Riga label="Note staff">{progetto?.note_staff}</Riga>
                      <Riga label="Consegnato il">{dataIt(r.consegnato_at)}</Riga>
                      <Riga label="Esito">
                        {r.vincitore
                          ? `Vincitore${r.posizione ? `, posizione ${r.posizione}` : ""}`
                          : r.posizione
                            ? `Posizione ${r.posizione}`
                            : "Non ancora designato"}
                      </Riga>

                      {/* I sei testi dell'art. 7 non passano da questa rotta:
                          la GET del pannello torna solo i campi corti, e i
                          testi integrali stanno nell'export con ?testi=1.
                          Dirlo qui evita che qualcuno concluda che il team ha
                          consegnato una scheda vuota. */}
                      <div style={{ ...NOTA_ATTESA, marginTop: 14 }}>
                        I sei testi dell&apos;art. 7 non compaiono in questa schermata: sono
                        lunghi migliaia di caratteri e li leggono i commissari, ciascuno nella
                        propria area. Per rileggerli qui c&apos;è l&apos;export{" "}
                        <a
                          href={`${ROTTA}/export?cosa=progetti&testi=1`}
                          style={{ textDecoration: "underline" }}
                        >
                          Progetti con i testi
                        </a>
                        .
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {/* L'esito dell'art. 6 si legge e non si scrive: manca la rotta dello
          staff che lo scriverebbe, e inventarla dal client non si puo. Meglio
          dirlo che lasciare in schermata un comando che non risponde. */}
      {vista === "classifica" && classifica.length > 0 && (
        <div style={NOTA_ATTESA}>
          <strong>Il vincitore e le posizioni si leggono qui, ma non si assegnano.</strong> Le
          colonne <code>vincitore</code> e <code>posizione</code> dei progetti esistono a
          database e compaiono in questa classifica e nell&apos;export, ma non esiste ancora una
          rotta dello staff che le scriva: finché non c&apos;è, l&apos;esito va impostato dal
          database. Il resto della schermata funziona senza.
        </div>
      )}

      {/* ── Squadre ── */}
      {vista === "squadre" &&
        (squadre.length === 0 ? (
          <div className="card text-center" style={{ padding: 40 }}>
            <p className="text-gray-600 m-0">
              Nessuna squadra. Compaiono qui appena i partecipanti confermati iniziano a
              formarle, cosa che richiede la fase delle squadre aperta.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {squadre.map((s, i) => {
              const membri = membriPerSquadra.get(s.id) ?? [];
              const atenei: string[] = s.atenei ?? [];
              const statoProgetto = s.progetto_stato as string | null;
              const coloreProgetto = statoProgetto
                ? statoProgettoColoreUniversita(statoProgetto)
                : COLORE_SPENTO;
              const completa = (s.componenti ?? 0) >= SQUADRA_MIN;
              return (
                <div
                  key={s.id}
                  style={{
                    padding: "14px 18px",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                    opacity: s.stato === "aperta" ? 1 : 0.55,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                        {s.nome}
                      </div>
                      <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                        codice <span style={{ fontFamily: "monospace" }}>{s.codice}</span>
                        {s.capitano ? ` . capitano ${s.capitano}` : ""}
                        {s.stato !== "aperta" ? " . sciolta" : ""}
                      </div>
                    </div>

                    <Badge colore={completa ? COLORE_CONSEGNATO : COLORE_BOZZA}>
                      {s.componenti ?? 0} su {SQUADRA_MAX}
                      {completa ? "" : ` . sotto i ${SQUADRA_MIN}`}
                    </Badge>

                    <Badge colore={atenei.length > 1 ? COLORE_CONSEGNATO : COLORE_SPENTO}>
                      {conta(atenei.length, "ateneo", "atenei")}
                    </Badge>

                    <Badge colore={coloreProgetto}>
                      {statoProgetto
                        ? statoProgettoLabelUniversita(statoProgetto)
                        : "Nessun progetto"}
                    </Badge>
                  </div>

                  {membri.length > 0 && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-light)",
                        marginTop: 6,
                        lineHeight: 1.6,
                      }}
                    >
                      {elencoMembri(s.id)}
                    </div>
                  )}

                  {atenei.length > 0 && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-light)",
                        marginTop: 4,
                        lineHeight: 1.6,
                      }}
                    >
                      {atenei.join(" . ")}
                    </div>
                  )}

                  {s.progetto_titolo && (
                    <div style={{ fontSize: 13, color: "var(--text-dark)", marginTop: 6 }}>
                      {s.progetto_titolo}
                      {s.progetto_consegnato_at
                        ? ` . consegnato il ${dataIt(s.progetto_consegnato_at)}`
                        : ""}
                    </div>
                  )}

                  {/* Chi cerca componenti lo dichiara dalla sua area, e lo
                      staff lo vede qui: e l'altra meta della bacheca, quella
                      che permette di suggerire un abbinamento a mano. */}
                  {s.cerca_membri && (
                    <div style={{ fontSize: 12.5, color: COLORE_BOZZA, marginTop: 6 }}>
                      Cerca componenti{s.cerca_nota ? ` . ${s.cerca_nota}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {/* Le bozze non compaiono in classifica e non hanno una scheda loro:
          questa riga e l'unico posto in cui si vede quante sono, e serve a
          sapere quanto lavoro sta per arrivare alla Commissione. */}
      {vista === "squadre" && progetti.length > 0 && (
        <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
          {conta(progetti.filter((p) => p.stato === "bozza").length, "bozza", "bozze")} in corso
          su {conta(progetti.length, "progetto", "progetti")} in tutto. Gli ambiti previsti
          dall&apos;art. 1 sono {AMBITI_PROGETTO.map((a) => a.label).join(", ")}.
        </p>
      )}
    </div>
  );
}
