"use client";

/**
 * Le quattro schermate dello staff del percorso universitario, in una pagina.
 *
 * L'ordine non e alfabetico ma cronologico, ed e quello in cui il percorso
 * accade: prima arrivano le candidature, poi si formano le squadre e si
 * consegnano i progetti, poi valuta la Commissione, e i mentor accompagnano
 * tutto il resto. Chi apre il pannello a meta percorso trova per prima la
 * fase in cui e entrato.
 *
 * Il caricamento sta qui e non nelle schede. Candidature, squadre, progetti
 * e classifica sono la stessa fotografia, e la rotta le torna insieme
 * apposta: chiederle una per scheda vorrebbe dire che il numero di squadre
 * in cima e quello dentro la scheda possono venire da due istanti diversi e
 * non coincidere, che su un pannello di istruttoria e il modo piu rapido di
 * perdere la fiducia di chi lo usa. La Commissione e i mentor fanno
 * eccezione e si caricano da sole, perche vivono su due rotte loro e non
 * compaiono in nessun'altra scheda.
 *
 * Sopra le schede c'e il quadro comandi delle fasi. Sta sopra e non dentro
 * una scheda perche non appartiene a nessuna delle quattro: da quelle sette
 * righe dipende se una candidatura entra da sola nel percorso, se le
 * squadre si possono formare, se la bacheca e visibile, se i progetti si
 * consegnano e se la Commissione puo aprire le schede.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CandidaturePanel } from "./CandidaturePanel";
import { SquadrePanel } from "./SquadrePanel";
import { CommissariPanel } from "./CommissariPanel";
import { MentorPanel } from "./MentorPanel";
import {
  CONFERMA_AUTOMATICA_DEFAULT,
  CONFIG_CHIAVI_UNIVERSITA,
  STATO_BOARD_DEFAULT,
  STATO_CONSEGNE_DEFAULT,
  STATO_SQUADRE_DEFAULT,
  STATO_VALUTAZIONE_DEFAULT,
  UNIVERSITA_PATH,
  statoCandidaturaColore,
  statoMentorColore,
  statoProgettoColoreUniversita,
} from "../content";

// Le rotte tornano righe intere delle loro tabelle, e le colonne le decide
// la migrazione: ricopiarne qui l'elenco creerebbe un secondo posto da
// aggiornare a ogni colonna nuova, che e esattamente il posto che nessuno
// aggiorna.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/admin";
const ROTTA_CONFIG = `${ROTTA}/config`;

const SCHERMATE = [
  { id: "candidature", label: "Candidature" },
  { id: "squadre", label: "Squadre e progetti" },
  { id: "commissione", label: "Commissione" },
  { id: "mentor", label: "Mentor" },
] as const;

type Schermata = (typeof SCHERMATE)[number]["id"];

const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: "0 10px",
  background: "#fff",
  color: "var(--text-dark)",
  fontSize: 13,
};

/**
 * I valori ammessi da ogni interruttore, copiati dalla tabella che la PUT
 * di `admin/config` usa per validarli.
 *
 * Non esiste una costante condivisa: `content.ts` dichiara i tipi, che a
 * runtime non esistono piu, e la rotta tiene i suoi `Set`. Ricopiarli qui
 * dentro un menu a tendina e comunque meglio dell'alternativa, che sarebbe
 * un riquadro di testo libero su una chiave da cui dipende l'apertura di
 * una fase: un refuso li si salverebbe come stringa e la rotta lo
 * rifiuterebbe, oppure, peggio, `leggiConfigUniversita` ricadrebbe sul
 * default chiuso senza che da nessuna parte risulti un errore.
 */
const VALORI_CONFIG: Record<string, readonly { value: string; label: string }[]> = {
  conferma_automatica: [
    { value: "si", label: "Sì, entra subito nel percorso" },
    { value: "no", label: "No, la conferma la dà lo staff" },
  ],
  stato_squadre: [
    { value: "chiuse", label: "Chiuse" },
    { value: "aperte", label: "Aperte" },
  ],
  stato_board: [
    { value: "chiusa", label: "Chiusa" },
    { value: "aperta", label: "Aperta" },
  ],
  stato_consegne: [
    { value: "chiuse", label: "Chiuse" },
    { value: "aperte", label: "Aperte" },
  ],
  stato_valutazione: [
    { value: "chiusa", label: "Chiusa" },
    { value: "aperta", label: "Aperta" },
  ],
};

/**
 * Il valore da mostrare quando la riga non c'e ancora in tabella. Sono gli
 * stessi fallback di `leggiConfigUniversita`, cioe tutti "chiuso": il
 * pannello deve far vedere quello che vede il percorso, non un valore
 * ottimistico che nessuno ha scritto.
 */
const DEFAULT_CONFIG: Record<string, string> = {
  conferma_automatica: CONFERMA_AUTOMATICA_DEFAULT,
  stato_squadre: STATO_SQUADRE_DEFAULT,
  stato_board: STATO_BOARD_DEFAULT,
  stato_consegne: STATO_CONSEGNE_DEFAULT,
  stato_valutazione: STATO_VALUTAZIONE_DEFAULT,
};

/**
 * Il titolo leggibile di ogni interruttore. La descrizione invece non sta
 * qui: arriva dalla GET, che torna `CONFIG_CHIAVI_UNIVERSITA` per intero
 * proprio perche il pannello non la ricopi e non finisca a spiegare una
 * chiave in un modo e il bando in un altro. Una chiave nuova che qui non
 * avesse ancora un titolo comparirebbe con il suo nome tecnico, che e
 * brutto ma vero.
 */
const ETICHETTE_CONFIG: Record<string, string> = {
  conferma_automatica: "Conferma automatica delle candidature",
  stato_squadre: "Formazione delle squadre",
  stato_board: "Bacheca di chi cerca compagni",
  stato_consegne: "Consegna dei progetti",
  scadenza_consegna_label: "Termine per la consegna",
  stato_valutazione: "Schede della Commissione",
  avviso: "Avviso in cima al bando",
};

const VERDE = statoCandidaturaColore("confermata");
const AMBRA = statoProgettoColoreUniversita("bozza");
const GRIGIO = statoCandidaturaColore("esclusa");
const COLORE_MENTOR = statoMentorColore("approvata");

/** I contatori di `universita_stats()`, nell'ordine in cui si leggono. */
const VOCI_STATS: { chiave: string; label: string; colore?: string }[] = [
  { chiave: "candidature", label: "Candidature" },
  { chiave: "confermate", label: "Nel percorso", colore: VERDE },
  { chiave: "escluse", label: "Escluse", colore: GRIGIO },
  { chiave: "con_account", label: "Con un account" },
  { chiave: "in_squadra", label: "In squadra" },
  { chiave: "cercano_squadra", label: "In bacheca", colore: AMBRA },
  { chiave: "squadre", label: "Squadre aperte" },
  { chiave: "progetti_bozza", label: "Bozze in corso", colore: AMBRA },
  { chiave: "progetti_consegnati", label: "Progetti consegnati", colore: VERDE },
  { chiave: "mentor_proposti", label: "Mentor in valutazione", colore: AMBRA },
  { chiave: "mentor_approvati", label: "Mentor approvati", colore: COLORE_MENTOR },
];

export function UniversitaAdminTabs() {
  const [attiva, setAttiva] = useState<Schermata>("candidature");
  const [dati, setDati] = useState<Qualsiasi>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [chiavi, setChiavi] = useState<Record<string, string>>(CONFIG_CHIAVI_UNIVERSITA);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  /**
   * Una lettura sola per tutto il pannello, piu la configurazione.
   *
   * Le due chiamate partono insieme e non in fila: sono indipendenti, e
   * metterle in coda raddoppierebbe l'attesa per niente. Se cade la prima
   * non c'e pannello e si mostra l'errore; se cade solo la seconda i dati
   * restano a schermo e l'errore lo dice, perche un elenco di candidature
   * senza il quadro comandi e comunque meta del lavoro, mentre un quadro
   * comandi senza candidature non e niente.
   */
  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const [resDati, resConfig] = await Promise.all([
        fetch(ROTTA, { cache: "no-store" }),
        fetch(ROTTA_CONFIG, { cache: "no-store" }),
      ]);

      const datiJson = await resDati.json();
      if (!resDati.ok) throw new Error(datiJson.error || "Caricamento non riuscito.");
      setDati(datiJson);

      const configJson = await resConfig.json();
      if (!resConfig.ok) {
        throw new Error(configJson.error || "Configurazione non leggibile.");
      }
      const mappa: Record<string, string> = {};
      for (const c of configJson.config ?? []) mappa[c.chiave] = c.valore ?? "";
      setConfig(mappa);
      if (configJson.chiavi) setChiavi(configJson.chiavi);
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
   * Un interruttore per volta, come vuole la PUT.
   *
   * La rotta rilegge e ritorna la tabella intera dopo ogni scrittura, quindi
   * qui non si rilegge niente: si sostituisce la mappa con quella che arriva.
   * E' anche l'unico modo di vedere il valore vero quando due persone stanno
   * guardando il pannello nello stesso momento.
   */
  const salvaConfig = async (chiave: string, valore: string) => {
    setSalvando(chiave);
    setErrore(null);
    try {
      const res = await fetch(ROTTA_CONFIG, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiave, valore }),
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

  /**
   * Rimpiazza una candidatura dopo un salvataggio, senza rileggere tutto.
   *
   * L'ordine dello spread conta: la riga che torna dalla PATCH e la riga di
   * tabella, e non ha `squadra_nome` ne `lezioni_completate`, che la GET
   * calcola innestando altre letture. Mettendo prima la vecchia, i due campi
   * derivati restano quelli di prima invece di sparire dalla schermata.
   */
  const onCandidatura = useCallback((riga: Qualsiasi) => {
    setDati((prev: Qualsiasi) =>
      prev
        ? {
            ...prev,
            candidature: (prev.candidature ?? []).map((c: Qualsiasi) =>
              c.id === riga.id ? { ...c, ...riga } : c,
            ),
          }
        : prev,
    );
  }, []);

  /**
   * I contatori, con una rete sotto.
   *
   * `universita_stats()` degrada a `null` se la migrazione non e ancora
   * passata o la RPC non risponde, e undici zeri sopra una tabella di
   * trecento righe non si leggono come "il contatore non c'e": si leggono
   * come "non e successo niente". Quando la RPC manca, i nove numeri che
   * dipendono dalle righe gia in mano si rifanno qui con le stesse
   * definizioni della funzione SQL. I due dei mentor no: vivono su un'altra
   * rotta, e restano un punto fermo invece di uno zero inventato.
   */
  const contatori = useMemo((): Record<string, number> => {
    const stats = dati?.stats as Record<string, number> | null | undefined;
    if (stats) return stats;

    const candidature: Qualsiasi[] = dati?.candidature ?? [];
    const squadre: Qualsiasi[] = dati?.squadre ?? [];
    const progetti: Qualsiasi[] = dati?.progetti ?? [];

    return {
      candidature: candidature.length,
      confermate: candidature.filter((c) => c.stato === "confermata").length,
      escluse: candidature.filter((c) => c.stato === "esclusa").length,
      con_account: candidature.filter((c) => !!c.user_id).length,
      in_squadra: candidature.filter((c) => !!c.squadra_id).length,
      cercano_squadra: candidature.filter(
        (c) => c.cerca_squadra && c.consenso_board && !c.squadra_id && c.stato === "confermata",
      ).length,
      squadre: squadre.filter((s) => s.stato === "aperta").length,
      progetti_bozza: progetti.filter((p) => p.stato === "bozza").length,
      progetti_consegnati: progetti.filter((p) => p.stato === "consegnato").length,
    };
  }, [dati]);

  const chiaviOrdinate = useMemo(() => Object.keys(chiavi), [chiavi]);

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  if (errore && !dati) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <p className="text-gray-600 mb-4">{errore}</p>
        <Button type="button" variant="outline" onClick={carica}>
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Percorso universitario</h1>
          <p className="text-sm text-gray-600">
            Biotecnologie e Intelligenza Artificiale . bando del 2 settembre 2026 .{" "}
            <a href={UNIVERSITA_PATH} style={{ color: "var(--primary-dark)" }}>
              la pagina pubblica
            </a>
          </p>
        </div>
        <Button type="button" variant="outline" disabled={!!salvando} onClick={carica}>
          Aggiorna
        </Button>
      </div>

      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ── Contatori ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {VOCI_STATS.map((v) => {
          const valore = contatori[v.chiave];
          return (
            <div key={v.chiave} className="card-sm" style={{ padding: 14 }}>
              <div className="stat-number" style={{ fontSize: 24, color: v.colore }}>
                {valore === undefined ? "." : valore}
              </div>
              <div className="stat-label">{v.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Quadro comandi delle fasi ── */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Le fasi del percorso
        </h2>
        <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
          Si aprono in ordine e a mano. L&apos;art. 11 rimanda termini e modalità ai canali
          ufficiali degli organizzatori, quindi queste righe vivono qui e non nel codice: una
          data comunicata non deve aspettare un rilascio del sito. Ogni comando si salva da solo
          appena lo cambi.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {chiaviOrdinate.map((chiave, i) => {
            const opzioni = VALORI_CONFIG[chiave];
            const valore = config[chiave] ?? DEFAULT_CONFIG[chiave] ?? "";
            return (
              <div
                key={chiave}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "13px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--border-color)",
                }}
              >
                <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                  <div
                    style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-dark)" }}
                  >
                    {ETICHETTE_CONFIG[chiave] ?? chiave}
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-light)",
                      lineHeight: 1.6,
                      margin: "3px 0 0",
                    }}
                  >
                    {chiavi[chiave]}
                  </p>
                </div>

                {opzioni ? (
                  <select
                    value={valore}
                    disabled={salvando === chiave}
                    onChange={(e) => salvaConfig(chiave, e.target.value)}
                    style={{ ...selectStyle, flex: "0 1 280px" }}
                  >
                    {opzioni.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* Testo libero. Si salva sul blur e non a ogni tasto: sono
                     righe che finiscono in pagina come sono, e una PUT per
                     lettera scriverebbe in tabella anche tutti i mezzi
                     pensieri. Il `key` legato al valore rimonta il riquadro
                     quando il valore cambia da fuori, altrimenti un
                     `defaultValue` resterebbe fermo a quello vecchio. */
                  <Input
                    key={`${chiave}-${valore}`}
                    defaultValue={valore}
                    maxLength={400}
                    placeholder={
                      chiave === "avviso"
                        ? "Vuoto per non mostrarlo"
                        : "Vuoto finché non è stato fissato"
                    }
                    disabled={salvando === chiave}
                    onBlur={(e) => {
                      if (e.target.value !== valore) salvaConfig(chiave, e.target.value);
                    }}
                    style={{ flex: "0 1 280px" }}
                  />
                )}

                {salvando === chiave && (
                  <span style={{ fontSize: 12, color: "var(--text-light)" }}>Salvataggio…</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Le quattro schede ── */}
      <div
        className="card-sm flex flex-wrap gap-2 items-center"
        style={{ padding: 10, position: "sticky", top: 78, zIndex: 5 }}
      >
        {SCHERMATE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAttiva(s.id)}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              background: attiva === s.id ? "var(--primary-light)" : "transparent",
              color: attiva === s.id ? "var(--text-dark)" : "var(--text-light)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {attiva === "candidature" && (
        <CandidaturePanel
          candidature={dati?.candidature ?? []}
          totaleLezioni={dati?.totale_lezioni ?? 0}
          onCandidatura={onCandidatura}
        />
      )}
      {attiva === "squadre" && (
        <SquadrePanel
          squadre={dati?.squadre ?? []}
          progetti={dati?.progetti ?? []}
          classifica={dati?.classifica ?? []}
          candidature={dati?.candidature ?? []}
        />
      )}
      {attiva === "commissione" && <CommissariPanel />}
      {attiva === "mentor" && <MentorPanel />}
    </div>
  );
}
