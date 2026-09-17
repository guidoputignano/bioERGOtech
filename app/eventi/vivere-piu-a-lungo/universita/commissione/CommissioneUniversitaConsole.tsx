"use client";

/**
 * Console della Commissione del percorso universitario (art. 8).
 *
 * Quattro scelte che vale la pena spiegare, perche sono tutte scomode e
 * tutte volute.
 *
 * 1. Il commissario vede soltanto le proprie schede. Il punteggio degli
 *    altri non compare, ne singolo ne in media, ed e la ragione per cui
 *    questa schermata ha la forma che ha: un voto letto prima di dare il
 *    proprio lo tira verso di se, e la media di cinque giudizi ancorati
 *    vale meno di cinque giudizi indipendenti. La nota sta in cima, non in
 *    fondo, perche e il patto che regge tutto il resto.
 *
 * 2. Non ci sono i nomi di chi ha scritto il progetto. Nei licei quella
 *    scelta nasce dall'eta degli iscritti; qui i candidati sono adulti e la
 *    ragione e un'altra: i sei criteri dell'art. 7 misurano tutti il lavoro
 *    e nessuno gli autori, quindi un nome in schermata puo solo spostare un
 *    voto, mai fondarlo. Gli atenei restano, e non e una contraddizione:
 *    l'art. 8 chiede di dichiarare il conflitto di interessi, e il
 *    conflitto si dichiara sull'appartenenza, non sulla persona.
 *
 * 3. Una scheda entra in classifica solo quando viene chiusa, e chiuderla e
 *    un comando a se. Una scheda a meta non e un voto basso: e un voto non
 *    ancora dato, e farla pesare penalizzerebbe un progetto senza che
 *    nessuno lo abbia deciso. Per lo stesso motivo la chiusura non si
 *    disfa da qui: l'art. 9 avvia il vincitore a una pubblicazione, e una
 *    classifica che cambia perche qualcuno ha riaperto un voto in silenzio
 *    non e una classifica. La riapertura esiste, ma e un atto dello staff.
 *
 * 4. A chi siede senza diritto di voto i riquadri dei punteggi non
 *    compaiono affatto, invece di comparire disattivati. Mostrare sei campi
 *    spenti a chi strutturalmente non potra mai usarli e rumore, e per di
 *    piu ambiguo: sembra un permesso che arrivera. La nota invece resta,
 *    perche quella vale davvero e finisce agli atti.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CAMPI_PROGETTO_UNIVERSITA,
  CAMPI_PUNTEGGIO_UNIVERSITA,
  CRITERI_UNIVERSITA,
  CRITERIO_DIRIMENTE,
  GIUDIZI_PUBBLICABILE,
  NOTA_PUBBLICABILE,
  NOTA_VALUTAZIONE_INDIPENDENTE_UNIVERSITA,
  PUNTEGGIO_MASSIMO,
  ambitoLabel,
  ruoloCommissioneLabelUniversita,
  statoProgettoColoreUniversita,
  type CampoPunteggioUniversita,
} from "../content";
import { totaleScheda, type ValutazioneInput } from "@/lib/eventi/universita-squadre";

// La rotta torna righe intere delle sue tabelle, e le colonne le decide la
// migrazione: ricopiarne qui l'elenco creerebbe un secondo posto da
// aggiornare a ogni colonna nuova, che e esattamente il posto che nessuno
// aggiorna.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/commissione";

// Lo stesso limite che `validateScheda` applica sul server. Li e scritto a
// mano e in `content.ts` non esiste una costante per questa nota: la
// ricopiamo qui, dichiarandolo, perche un `maxLength` che non coincide con
// la validazione lascia scrivere quattromilacinquecento caratteri per poi
// rifiutarli dopo, cioe nel momento peggiore.
const NOTA_MAX = 4000;

/**
 * I due riquadri di servizio del modulo, verde e ambra, uguali a quelli
 * dell'area del partecipante. Un avviso che cambia colore da una schermata
 * all'altra sembra un altro tipo di avviso.
 */
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

/**
 * Lo stato di una scheda non ha un elenco di colori tutto suo in
 * `content.ts`, e inventarne uno qui vorrebbe dire scrivere due esadecimali
 * dentro una console. Li prendiamo dagli stati del progetto, che sono gli
 * stessi due gia in uso nel modulo, e le parole coincidono: una scheda
 * chiusa e una consegna, una scheda ancora aperta e una bozza.
 */
const COLORE_FATTO = statoProgettoColoreUniversita("consegnato");
const COLORE_ATTESA = statoProgettoColoreUniversita("bozza");

const boxStyle: React.CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  background: "#fff",
  color: "var(--text-dark)",
  width: "100%",
};

const etichettaStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-light)",
  marginBottom: 4,
};

const dataIt = (v: string | null): string =>
  v
    ? new Date(v).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
    : "";

/** Il plurale di una parola sola, che qui serve tre volte in due righe. */
const conta = (n: number, uno: string, molti: string): string =>
  `${n} ${n === 1 ? uno : molti}`;

/**
 * La scheda come la tiene la console: i sei punteggi, il giudizio e la nota
 * in lavorazione, piu i tre campi che decide il server. `pubblicabile` e una
 * stringa e non `null` perche a valle c'e un menu a tendina, e un menu con
 * dentro `null` non seleziona la voce vuota, semplicemente non seleziona.
 */
type SchedaLocale = ValutazioneInput & {
  progetto_id: string;
  chiusa: boolean;
  chiusa_at: string | null;
  totale: number;
};

function schedaVuota(progettoId: string): SchedaLocale {
  const scheda: SchedaLocale = {
    progetto_id: progettoId,
    nota: "",
    pubblicabile: "",
    chiusa: false,
    chiusa_at: null,
    totale: 0,
  };
  for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) scheda[c.campo] = null;
  return scheda;
}

/**
 * Dalla riga che torna dal server ai campi del modulo, uno per uno.
 *
 * Copiarla cosi com'e sarebbe piu corto, ma porterebbe dentro i `null`
 * delle colonne mai compilate, e un `null` in un campo controllato di React
 * e il modo piu breve per ritrovarsi un riquadro che smette di rispondere
 * senza dire perche.
 */
function daServer(riga: Qualsiasi, progettoId: string): SchedaLocale {
  const scheda = schedaVuota(progettoId);
  if (!riga) return scheda;
  for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) {
    const v = riga[c.campo];
    scheda[c.campo] = typeof v === "number" ? v : null;
  }
  scheda.nota = riga.nota ?? "";
  scheda.pubblicabile = riga.pubblicabile ?? "";
  scheda.chiusa = riga.chiusa === true;
  scheda.chiusa_at = riga.chiusa_at ?? null;
  scheda.totale = typeof riga.totale === "number" ? riga.totale : 0;
  return scheda;
}

function Pillola({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: "var(--primary-light)",
        color: "var(--primary-dark)",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/** Un campo del progetto, con la sua intestazione e il suo testo. */
function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={etichettaStyle}>{label}</div>
      <div
        style={{
          fontSize: 13.5,
          color: "var(--text-dark)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.65,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CommissioneUniversitaConsole() {
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [schede, setSchede] = useState<Record<string, SchedaLocale>>({});
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<{ progetto: string; testo: string } | null>(null);
  const [occupato, setOccupato] = useState<string | null>(null);

  // Un progetto per volta. La Commissione legge sei campi lunghi e poi da
  // sei voti: due progetti aperti insieme vorrebbero dire scorrere in mezzo
  // a due testi per capire quale riquadro appartiene a quale, ed e il modo
  // piu facile per scrivere un punteggio nella scheda sbagliata.
  const [aperto, setAperto] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch(ROTTA, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setDati(data);
      const mappa: Record<string, SchedaLocale> = {};
      for (const p of data.progetti ?? []) mappa[p.id] = daServer(p.scheda, p.id);
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

  /**
   * Un solo canale per le mutazioni e per i loro errori.
   *
   * Il salvataggio e la chiusura tornano la stessa identica forma di scheda
   * della GET, quindi dopo un comando non si rilegge niente: si sostituisce
   * la riga che la console ha in mano. Una rilettura qui costerebbe anche il
   * punto in cui si e rimasti a leggere, che su un progetto lungo e la cosa
   * che da piu fastidio perdere.
   */
  const chiama = async (
    progettoId: string,
    metodo: "PATCH" | "POST",
    corpo: Record<string, unknown>,
  ) => {
    setOccupato(progettoId);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch(ROTTA, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, progetto_id: progettoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      if (data.scheda) {
        setSchede((p) => ({ ...p, [progettoId]: daServer(data.scheda, progettoId) }));
      }
      return data;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      return null;
    } finally {
      setOccupato(null);
    }
  };

  const commissario = dati?.commissario ?? null;
  const puoVotare = commissario?.diritto_voto === true;
  const faseAperta = dati?.config?.stato_valutazione === "aperta";
  const progetti: Qualsiasi[] = useMemo(() => dati?.progetti ?? [], [dati]);

  const aggiorna = (progettoId: string, patch: Partial<SchedaLocale>) => {
    setSchede((prev) => ({
      ...prev,
      [progettoId]: { ...(prev[progettoId] ?? schedaVuota(progettoId)), ...patch },
    }));
  };

  // Un riquadro numerico puo restituire una stringa che non e un numero
  // mentre la si sta scrivendo. Un `NaN` nello stato diventerebbe un campo
  // vuoto che pero non e vuoto, e alla chiusura il server direbbe che manca
  // un punteggio che a schermo si vede: meglio trattarlo come non dato.
  const aggiornaPunteggio = (
    progettoId: string,
    campo: CampoPunteggioUniversita,
    grezzo: string,
  ) => {
    const n = grezzo === "" ? null : Number(grezzo);
    aggiorna(progettoId, { [campo]: n === null || Number.isNaN(n) ? null : n });
  };

  /**
   * Il corpo del salvataggio, costruito dalla scheda a schermo.
   *
   * A chi non ha diritto di voto le chiavi dei punteggi non si mandano
   * affatto. La rotta le accetterebbe se nulle, ma spedire sei `null` di una
   * cosa che quella persona non puo dare vuol dire affidarsi a una regola
   * che non scatta invece che non toccare la regola: basta che un giorno il
   * campo smetta di essere nullo e il salvataggio comincia a rispondere 403
   * a chi sta solo scrivendo una nota.
   */
  const corpoScheda = (progettoId: string): Record<string, unknown> => {
    const scheda = schede[progettoId] ?? schedaVuota(progettoId);
    const corpo: Record<string, unknown> = {
      nota: scheda.nota ?? "",
      pubblicabile: scheda.pubblicabile ?? "",
    };
    if (puoVotare) {
      for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) corpo[c.campo] = scheda[c.campo] ?? null;
    }
    return corpo;
  };

  const salva = async (progettoId: string) => {
    const esito = await chiama(progettoId, "PATCH", corpoScheda(progettoId));
    if (esito) {
      setAvviso({
        progetto: progettoId,
        testo: puoVotare
          ? "Scheda salvata. Resta un suo appunto: entra nella media solo quando la chiude."
          : "Nota salvata. Resta agli atti e la legge la Commissione in seduta.",
      });
    }
    return esito;
  };

  /**
   * La chiusura valida la riga che sta a database, non quello che il browser
   * manda insieme al comando: e giusto cosi, perche si conferma la stessa
   * versione che si e appena riletta. Proprio per questo pero si salva
   * sempre un istante prima, altrimenti chi scrive i sei voti e preme
   * direttamente "Chiudi" si sentirebbe rispondere che manca un punteggio
   * che ha davanti agli occhi.
   */
  const chiudi = async (progetto: Qualsiasi) => {
    if (
      !confirm(
        `Chiude la scheda di "${progetto.titolo}"? La scheda chiusa è quella che conta: entra nella media della classifica e da qui non si modifica più. Se dovesse correggerla, la riapertura è un atto dello staff e resta a verbale.`,
      )
    ) {
      return;
    }
    if (!(await salva(progetto.id))) return;
    const esito = await chiama(progetto.id, "POST", {});
    if (esito) {
      setAvviso({
        progetto: progetto.id,
        testo: "Scheda chiusa. Da adesso entra nella media della classifica.",
      });
    }
  };

  /**
   * Quante schede sono chiuse e quante mancano. A chi non vota quel conto
   * non direbbe niente, perche non ne puo chiudere nessuna: al suo posto si
   * contano le note, che sono quello che lascia davvero.
   */
  const conteggi = useMemo(() => {
    let chiuse = 0;
    let note = 0;
    for (const p of progetti) {
      const scheda = schede[p.id];
      if (scheda?.chiusa) chiuse += 1;
      if ((scheda?.nota ?? "").trim()) note += 1;
    }
    return { chiuse, note, totali: progetti.length };
  }, [progetti, schede]);

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
        <p className="text-sm text-gray-600" style={{ margin: "2px 0 0" }}>
          {commissario?.nome} {commissario?.cognome}
          {commissario?.ruolo ? ` . ${ruoloCommissioneLabelUniversita(commissario.ruolo)}` : ""}
        </p>
        {!puoVotare && (
          <span
            className="badge"
            style={{
              background: `${COLORE_ATTESA}1A`,
              color: COLORE_ATTESA,
              marginTop: 8,
              display: "inline-block",
            }}
          >
            Senza diritto di voto . i suoi punteggi non entrano nella media
          </span>
        )}
      </div>

      {/* Sta in cima e non in fondo perche e il motivo per cui questa
          schermata e fatta cosi: si legge una volta e poi si capisce perche
          non si vede il voto di nessun altro. */}
      <div style={NOTA_OK}>{NOTA_VALUTAZIONE_INDIPENDENTE_UNIVERSITA}</div>

      {!puoVotare && (
        <div style={NOTA_ATTESA}>
          L&apos;art. 8 le assegna funzioni consultive e senza diritto di voto. Legge i progetti
          come gli altri commissari e può lasciare una nota su ciascuno, che resta agli atti e vale
          nella discussione in seduta. I riquadri dei punteggi non le compaiono perché non ci sono
          punteggi che lei debba dare.
        </div>
      )}

      {!faseAperta && (
        <div style={NOTA_ATTESA}>
          La fase di valutazione non è aperta in questo momento, quindi le schede sono in sola
          lettura. Può leggere i progetti consegnati e rileggere quello che ha già scritto. Quando
          lo staff riapre la fase, i riquadri tornano modificabili con dentro gli stessi valori.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm" style={{ padding: 16 }}>
          <div className="stat-number" style={{ fontSize: 26 }}>
            {conteggi.totali}
          </div>
          <div className="stat-label">Progetti consegnati</div>
        </div>
        {puoVotare ? (
          <>
            <div className="card-sm" style={{ padding: 16 }}>
              <div className="stat-number" style={{ fontSize: 26 }}>
                {conteggi.chiuse}
              </div>
              <div className="stat-label">Schede chiuse</div>
            </div>
            <div className="card-sm" style={{ padding: 16 }}>
              <div className="stat-number" style={{ fontSize: 26, color: COLORE_ATTESA }}>
                {conteggi.totali - conteggi.chiuse}
              </div>
              <div className="stat-label">Ancora da valutare</div>
            </div>
          </>
        ) : (
          <div className="card-sm" style={{ padding: 16 }}>
            <div className="stat-number" style={{ fontSize: 26 }}>
              {conteggi.note}
            </div>
            <div className="stat-label">Note lasciate</div>
          </div>
        )}
        <div className="card-sm" style={{ padding: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.6 }}>
            A parità di punteggio decide <strong>{CRITERIO_DIRIMENTE}</strong>, come previsto
            dall&apos;art. 7.
          </div>
        </div>
      </div>

      {progetti.length === 0 ? (
        <div className="card text-center" style={{ padding: 40 }}>
          <p className="text-gray-600 m-0">
            Nessun progetto è stato ancora consegnato. Appena le squadre consegnano, li trova qui,
            in ordine di consegna.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {progetti.map((p: Qualsiasi) => {
            const scheda = schede[p.id] ?? schedaVuota(p.id);
            const chiusa = scheda.chiusa;
            // Mentre si scrive il totale deve seguire i campi, altrimenti
            // non serve a niente; a scheda chiusa si mostra invece il numero
            // che il database ha calcolato e conservato, che e quello che
            // entra in classifica.
            const totale = chiusa ? scheda.totale : totaleScheda(scheda);
            const fatto = puoVotare ? chiusa : !!(scheda.nota ?? "").trim();
            const espanso = aperto === p.id;
            const atenei: string[] = p.atenei ?? [];
            const inCorso = occupato === p.id;
            const modificabile = faseAperta && !chiusa;

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
                      {p.squadra_nome || "Squadra senza nome"}
                      {p.ambito ? ` . ${ambitoLabel(p.ambito)}` : ""}
                      {` . ${conta(p.componenti ?? 0, "componente", "componenti")}`}
                      {atenei.length > 0 ? ` . ${conta(atenei.length, "ateneo", "atenei")}` : ""}
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: `${fatto ? COLORE_FATTO : COLORE_ATTESA}1A`,
                      color: fatto ? COLORE_FATTO : COLORE_ATTESA,
                      flexShrink: 0,
                    }}
                  >
                    {puoVotare
                      ? chiusa
                        ? `Valutato . ${totale} / ${PUNTEGGIO_MASSIMO}`
                        : "Da valutare"
                      : fatto
                        ? "Nota lasciata"
                        : "Da leggere"}
                  </span>

                  <i
                    className={`fas fa-chevron-${espanso ? "up" : "down"}`}
                    style={{ color: "var(--text-light)", fontSize: 13 }}
                  />
                </button>

                {espanso && (
                  <div
                    style={{ padding: "0 20px 20px", borderTop: "1px solid var(--border-color)" }}
                  >
                    {/* ── Il progetto, come si legge ─────────────────── */}
                    <div style={{ paddingTop: 16 }}>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
                      >
                        <Pillola>{p.squadra_nome || "Squadra senza nome"}</Pillola>
                        <Pillola>{conta(p.componenti ?? 0, "componente", "componenti")}</Pillola>
                        <Pillola>{conta(atenei.length, "ateneo", "atenei")}</Pillola>
                        {p.consegnato_at && <Pillola>Consegnato il {dataIt(p.consegnato_at)}</Pillola>}
                      </div>

                      {atenei.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={etichettaStyle}>Atenei della squadra</div>
                          <div style={{ fontSize: 13.5, color: "var(--text-dark)" }}>
                            {atenei.join(" . ")}
                          </div>
                          {/* Gli atenei sono l'unica cosa che diciamo delle
                              persone, e li diciamo per questo: il conflitto
                              di interessi dell'art. 8 si dichiara
                              sull'appartenenza, non sul nome di chi scrive. */}
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-light)",
                              lineHeight: 1.55,
                              marginTop: 3,
                            }}
                          >
                            Se uno di questi è il suo, l&apos;art. 8 le chiede di dichiarare il
                            conflitto di interessi e di astenersi dalla valutazione di questo
                            progetto.
                          </div>
                        </div>
                      )}

                      {p.ambito && <Campo label="Ambito">{ambitoLabel(p.ambito)}</Campo>}

                      {CAMPI_PROGETTO_UNIVERSITA.map((c) => (
                        <Campo key={c.campo} label={c.label}>
                          {p[c.campo] || "Non compilato."}
                        </Campo>
                      ))}

                      {p.link_materiali && (
                        <Campo label="Materiali">
                          <a
                            href={p.link_materiali}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--primary-dark)",
                              fontWeight: 600,
                              wordBreak: "break-all",
                            }}
                          >
                            {p.link_materiali}
                          </a>
                        </Campo>
                      )}
                    </div>

                    {/* ── La scheda ──────────────────────────────────── */}
                    <div
                      style={{
                        background: "var(--bg-light)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        padding: 18,
                        marginTop: 8,
                      }}
                    >
                      <div
                        className="flex flex-wrap items-center justify-between gap-3"
                        style={{ marginBottom: 14 }}
                      >
                        <h3
                          className="font-semibold text-gray-800"
                          style={{ fontSize: 14.5, margin: 0 }}
                        >
                          {puoVotare ? "La sua scheda" : "La sua nota per la seduta"}
                        </h3>
                        {puoVotare && (
                          <span
                            style={{ fontSize: 15, fontWeight: 800, color: "var(--primary-dark)" }}
                          >
                            {totale} / {PUNTEGGIO_MASSIMO}
                          </span>
                        )}
                      </div>

                      {chiusa && (
                        <div style={{ ...NOTA_OK, marginBottom: 14 }}>
                          Scheda chiusa{scheda.chiusa_at ? ` il ${dataIt(scheda.chiusa_at)}` : ""}.
                          È la versione che entra nella media della classifica e da qui non si
                          modifica più. Se deve correggerla, scriva alla segreteria della
                          Commissione: la riapertura è un atto dello staff e resta a verbale.
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {puoVotare &&
                          CAMPI_PUNTEGGIO_UNIVERSITA.map((c) => {
                            // La descrizione del criterio sta una volta sola,
                            // nell'art. 7 in `content.ts`: qui la si cerca,
                            // non la si riscrive, altrimenti la scheda e il
                            // bando finirebbero per dire due cose diverse
                            // dello stesso criterio.
                            const criterio = CRITERI_UNIVERSITA.find((k) => k.nome === c.criterio);
                            const valore = scheda[c.campo];
                            return (
                              <div
                                key={c.campo}
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 13.5,
                                      fontWeight: 600,
                                      color: "var(--text-dark)",
                                    }}
                                  >
                                    {c.criterio}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      color: "var(--text-light)",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {criterio?.desc}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    flexShrink: 0,
                                  }}
                                >
                                  {chiusa ? (
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        color: "var(--text-dark)",
                                        width: 84,
                                        textAlign: "right",
                                      }}
                                    >
                                      {valore ?? 0}
                                    </span>
                                  ) : (
                                    <Input
                                      type="number"
                                      min={0}
                                      max={c.max}
                                      step={0.5}
                                      value={valore ?? ""}
                                      disabled={!modificabile || inCorso}
                                      aria-label={c.criterio}
                                      onChange={(e) =>
                                        aggiornaPunteggio(p.id, c.campo, e.target.value)
                                      }
                                      style={{ width: 84, height: 36, textAlign: "right" }}
                                    />
                                  )}
                                  <span
                                    style={{ fontSize: 12.5, color: "var(--text-light)", width: 46 }}
                                  >
                                    0 a {c.max}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                        {/* Il giudizio sulla pubblicabilita resta anche a chi
                            non vota: non e un punteggio, e l'art. 7 chiede di
                            considerarlo, quindi una voce consultiva e
                            esattamente il posto in cui puo servire. */}
                        <div>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "var(--text-dark)",
                              marginBottom: 3,
                            }}
                          >
                            Può diventare un articolo sottoponibile a revisione fra pari?
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-light)",
                              lineHeight: 1.55,
                              marginBottom: 6,
                            }}
                          >
                            {NOTA_PUBBLICABILE}
                          </div>
                          {chiusa ? (
                            <div style={{ fontSize: 13.5, color: "var(--text-dark)" }}>
                              {GIUDIZI_PUBBLICABILE.find((g) => g.value === scheda.pubblicabile)
                                ?.label ?? "Non indicato."}
                            </div>
                          ) : (
                            <select
                              value={scheda.pubblicabile ?? ""}
                              disabled={!modificabile || inCorso}
                              aria-label="Giudizio sulla pubblicabilità"
                              onChange={(e) => aggiorna(p.id, { pubblicabile: e.target.value })}
                              style={{ ...boxStyle, height: 42 }}
                            >
                              <option value="">Non mi esprimo</option>
                              {GIUDIZI_PUBBLICABILE.map((g) => (
                                <option key={g.value} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "var(--text-dark)",
                              marginBottom: 5,
                            }}
                          >
                            Nota {puoVotare ? "(facoltativa)" : "per la seduta"}
                          </div>
                          {chiusa ? (
                            <div
                              style={{
                                fontSize: 13.5,
                                color: "var(--text-dark)",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.65,
                              }}
                            >
                              {scheda.nota || "Nessuna nota."}
                            </div>
                          ) : (
                            <textarea
                              rows={3}
                              value={scheda.nota ?? ""}
                              disabled={!modificabile || inCorso}
                              maxLength={NOTA_MAX}
                              aria-label="Nota sulla scheda"
                              onChange={(e) => aggiorna(p.id, { nota: e.target.value })}
                              style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
                            />
                          )}
                        </div>
                      </div>

                      {/* L'esito di un comando si legge dove il comando e
                          stato dato. Un riquadro in cima alla pagina, sopra
                          sei campi lunghi, verrebbe scritto fuori dallo
                          schermo di chi ha appena premuto il bottone: qui si
                          apre una scheda per volta, quindi l'unico errore
                          possibile e di questa. Il rosso non c'e perche non
                          esiste un rosso di questo modulo, e il riquadro
                          ambra e gia il modo in cui il percorso dice che
                          qualcosa si e fermato. */}
                      {errore && <div style={{ ...NOTA_ATTESA, marginTop: 14 }}>{errore}</div>}

                      {avviso && avviso.progetto === p.id && (
                        <div style={{ ...NOTA_OK, marginTop: 14 }}>{avviso.testo}</div>
                      )}

                      {modificabile && (
                        <>
                          <div className="flex flex-wrap gap-3" style={{ marginTop: 14 }}>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={inCorso}
                              onClick={() => salva(p.id)}
                              style={{ height: 36, fontSize: 13 }}
                            >
                              {inCorso ? "Salvataggio…" : "Salva"}
                            </Button>
                            {puoVotare && (
                              <Button
                                type="button"
                                disabled={inCorso}
                                onClick={() => chiudi(p)}
                                style={{ height: 36, fontSize: 13 }}
                              >
                                Chiudi la scheda
                              </Button>
                            )}
                          </div>

                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text-light)",
                              lineHeight: 1.6,
                              margin: "10px 0 0",
                            }}
                          >
                            {puoVotare
                              ? "La scheda entra nella media della classifica solo quando la chiude, e per chiuderla servono tutti e sei i punteggi. Fino ad allora resta un suo appunto, che non legge nessun altro."
                              : "La nota si salva quante volte vuole e non c'è nessuna scheda da chiudere: resta agli atti così come la scrive."}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
