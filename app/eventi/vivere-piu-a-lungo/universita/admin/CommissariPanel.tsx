"use client";

/**
 * Pannello staff della Commissione di valutazione (art. 8).
 *
 * L'account del commissario lo crea questa schermata, come per il gemello
 * dei licei e per la stessa ragione: chiedere a un professore ordinario di
 * registrarsi da solo su un sito, di trovare la pagina giusta e di capire
 * quale ruolo gli e stato dato e un modo affidabile di non ricevere le sue
 * schede.
 *
 * Il diritto di voto segue il ruolo e non e una spunta. Qui il ruolo e
 * obbligatorio, a differenza dei licei, perche da lui discende il voto: una
 * riga senza ruolo sarebbe una persona che conta nella media che decide chi
 * vince senza che nessuno lo abbia deciso. Per lo stesso motivo il pannello
 * non manda mai `diritto_voto` al server, nemmeno quando lo mostra: lo
 * mostra calcolandolo dalla tabella dei ruoli, e la rotta lo ricalcola per
 * conto suo. Cosi le due non possono dissentire.
 *
 * Disattivare ed eliminare non sono la stessa cosa e la differenza non e
 * reversibile: la prima toglie l'accesso e lascia le schede dove sono, la
 * seconda le porta via con se e le medie si ricalcolano senza. La conferma
 * lo dice per intero, con il numero delle schede in ballo, perche e l'unico
 * momento in cui quella frase serve a qualcosa.
 */

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  COMMISSIONE_PATH,
  RUOLI_COMMISSIONE_UNIVERSITA,
  ruoloCommissioneLabelUniversita,
  statoCandidaturaColore,
  statoProgettoColoreUniversita,
} from "../content";

// La rotta torna righe intere di `universita_commissari` piu il conteggio
// delle schede: le colonne le decide la migrazione.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Qualsiasi = any;

const ROTTA = "/api/eventi/universita/admin/commissari";

const NOTA_OK: React.CSSProperties = {
  background: "#ECFAF6",
  border: "1px solid #B4E3D8",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  color: "#08594A",
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

const COLORE_VOTO = statoCandidaturaColore("confermata");
const COLORE_SENZA_VOTO = statoProgettoColoreUniversita("bozza");

/**
 * Il diritto di voto derivato dal ruolo, con la stessa regola della rotta.
 * Serve a farlo vedere prima di salvare: chi sceglie "osservatore" deve
 * sapere subito che sta aggiungendo una voce che non conta nella media, non
 * scoprirlo dalla riga che compare dopo.
 */
const votoDelRuolo = (ruolo: string): boolean =>
  RUOLI_COMMISSIONE_UNIVERSITA.find((r) => r.value === ruolo)?.voto ?? true;

const VUOTO = { nome: "", cognome: "", email: "", ruolo: "esperto" };

function BadgeVoto({ voto }: { voto: boolean }) {
  return (
    <span
      className="badge"
      style={{
        background: voto ? `${COLORE_VOTO}1A` : `${COLORE_SENZA_VOTO}1A`,
        color: voto ? COLORE_VOTO : COLORE_SENZA_VOTO,
        flexShrink: 0,
      }}
    >
      {voto ? "Con voto" : "Senza voto"}
    </span>
  );
}

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
      const res = await fetch(ROTTA, { cache: "no-store" });
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

  /** Un solo canale per le mutazioni e per i loro errori. */
  const chiama = async (
    metodo: "POST" | "PATCH" | "DELETE",
    corpo: Record<string, unknown>,
    url: string = ROTTA,
  ): Promise<Qualsiasi | null> => {
    setOccupato(true);
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
      setOccupato(false);
    }
  };

  /**
   * Aggiunge un commissario, o reinvita chi c'era gia.
   *
   * La rotta fa un upsert su `user_id`, quindi la stessa persona invitata
   * due volte resta una riga sola. Per questo la riga che torna si fonde
   * con quella in elenco invece di essere aggiunta in coda, e il conteggio
   * delle schede si conserva: la risposta non lo contiene, e azzerarlo
   * farebbe sembrare perduto il lavoro di chi aveva gia votato.
   */
  const aggiungi = async () => {
    const data = await chiama("POST", nuovo);
    if (!data?.commissario) return;
    const riga = data.commissario;
    setRighe((prev) => {
      const esiste = prev.some((r) => r.id === riga.id);
      if (esiste) return prev.map((r) => (r.id === riga.id ? { ...r, ...riga } : r));
      return [...prev, { ...riga, schede: { totale: 0, aperte: 0, chiuse: 0 } }];
    });
    setAvviso(
      `${nuovo.nome} ${nuovo.cognome} è ora in Commissione. Se l'account era nuovo ha ricevuto anche il link per scegliere la password; se era già registrato sul sito accede con quella che ha già.`,
    );
    setNuovo(VUOTO);
  };

  /**
   * Attiva, disattiva, corregge il ruolo.
   *
   * `diritto_voto` non viene mandato: la rotta lo ricalcola dal ruolo e
   * ignorerebbe comunque il campo. La riga che torna lo porta aggiornato, e
   * l'etichetta accanto al menu cambia da sola.
   */
  const aggiorna = async (id: string, patch: Record<string, unknown>) => {
    const data = await chiama("PATCH", { id, ...patch });
    if (!data?.commissario) return;
    setRighe((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data.commissario, schede: r.schede } : r)),
    );
  };

  /**
   * Toglie un commissario, e con lui le sue schede.
   *
   * La conferma dice il numero e la conseguenza per esteso. Non e prudenza
   * formale: una scheda chiusa e un giudizio dato, cade per cascata insieme
   * alla riga, e la media del progetto che aveva valutato cambia senza che
   * nessun altro se ne accorga. Per chi ha semplicemente finito il suo
   * lavoro la strada e disattivarlo, e la conferma lo propone.
   */
  const elimina = async (r: Qualsiasi) => {
    const chiuse = Number(r.schede?.chiuse ?? 0);
    const aperte = Number(r.schede?.aperte ?? 0);
    const totale = chiuse + aperte;
    const messaggio =
      totale > 0
        ? `Eliminare ${r.cognome} ${r.nome} dalla Commissione cancella anche le sue ${totale} schede, di cui ${chiuse} già chiuse, e le medie dei progetti che aveva valutato si ricalcolano senza di lui. L'operazione non si annulla. Se ha semplicemente finito il suo lavoro conviene disattivarlo: gli toglie l'accesso e lascia i voti dove sono. Procedere con l'eliminazione?`
        : `Eliminare ${r.cognome} ${r.nome} dalla Commissione? Non ha ancora aperto nessuna scheda, quindi non si perde nessun giudizio.`;
    if (!confirm(messaggio)) return;

    const data = await chiama("DELETE", { id: r.id }, `${ROTTA}?id=${r.id}`);
    if (!data) return;
    setRighe((prev) => prev.filter((x) => x.id !== r.id));
    const eliminate = Number(data.schede_eliminate ?? 0);
    setAvviso(
      eliminate > 0
        ? `${r.cognome} ${r.nome} è stato rimosso dalla Commissione insieme alle sue ${eliminate} schede. Le medie sono già ricalcolate senza di lui.`
        : `${r.cognome} ${r.nome} è stato rimosso dalla Commissione.`,
    );
  };

  if (loading) return <p className="text-gray-600">Caricamento…</p>;

  const votanti = righe.filter((r) => r.attivo && r.diritto_voto).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Commissione di valutazione</h1>
        <p className="text-sm text-gray-600">
          Art. 8 . l&apos;area dei commissari è su{" "}
          <code style={{ fontSize: 12.5 }}>{COMMISSIONE_PATH}</code>
        </p>
      </div>

      {avviso && <div style={NOTA_OK}>{avviso}</div>}
      {errore && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{errore}</p>}

      {/* ── Aggiungi ── */}
      <div className="card" style={{ padding: 18 }}>
        <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
          Aggiungi un commissario
        </h2>
        <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
          L&apos;account viene creato qui e la persona riceve un&apos;email con l&apos;indirizzo
          della sua area e, se l&apos;account è nuovo, il link per impostare la password. Il ruolo
          è obbligatorio perché da lui discende il diritto di voto: l&apos;art. 8 lo riconosce a
          tutti i componenti tranne gli osservatori.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
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
            {RUOLI_COMMISSIONE_UNIVERSITA.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {/* L'etichetta si ricalcola mentre si sceglie: il diritto di voto
              e la conseguenza del ruolo, e va vista prima di salvare. */}
          <BadgeVoto voto={votoDelRuolo(nuovo.ruolo)} />
          <Button
            type="button"
            disabled={
              occupato || !nuovo.nome.trim() || !nuovo.cognome.trim() || !nuovo.email.trim()
            }
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
            classifica resta senza punteggi: la media si calcola sulle sole schede chiuse di chi
            vota.
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
                // Chi e disattivato resta in elenco ma smorzato: e stato in
                // Commissione, le sue schede contano ancora, e cancellarlo
                // dalla vista renderebbe inspiegabili le medie.
                opacity: r.attivo ? 1 : 0.55,
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div className="font-semibold text-gray-800" style={{ fontSize: 14.5 }}>
                  {r.cognome} {r.nome}
                </div>
                <div className="text-gray-600" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {r.email}
                  {r.ruolo ? ` . ${ruoloCommissioneLabelUniversita(r.ruolo)}` : ""}
                  {r.attivo ? "" : " . disattivato"}
                </div>
              </div>

              <BadgeVoto voto={!!r.diritto_voto} />

              <span
                style={{ fontSize: 12.5, color: "var(--text-light)", flexShrink: 0, minWidth: 96 }}
              >
                {r.schede?.chiuse ?? 0} chiuse
                {r.schede?.aperte ? `, ${r.schede.aperte} in corso` : ""}
              </span>

              <select
                value={r.ruolo ?? ""}
                disabled={occupato}
                onChange={(e) => aggiorna(r.id, { ruolo: e.target.value })}
                style={{ ...selectStyle, flex: "0 1 220px" }}
              >
                {/* La rotta non ammette un ruolo vuoto, quindi questa voce
                    non e scegliibile: esiste solo perche una riga vecchia
                    senza ruolo si veda per quello che e, invece di comparire
                    con il primo ruolo dell'elenco come se lo avesse. */}
                {!r.ruolo && (
                  <option value="" disabled>
                    Ruolo non indicato
                  </option>
                )}
                {RUOLI_COMMISSIONE_UNIVERSITA.map((x) => (
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
        {votanti === 1
          ? "1 commissario attivo con diritto di voto"
          : `${votanti} commissari attivi con diritto di voto`}
        . Disattivare toglie l&apos;accesso e lascia le schede al loro posto, quindi le medie non
        cambiano. Eliminare cancella anche le schede, e va usato per gli inserimenti sbagliati,
        non per chi ha finito il suo lavoro.
      </p>
    </div>
  );
}
