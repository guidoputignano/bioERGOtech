"use client";

/**
 * Chiusura del percorso: l'ultima schermata dello staff, e l'ultima cosa
 * che il percorso fa.
 *
 * L'informativa promette due cose: l'accesso di referenti e commissari si
 * spegne a fine corso, e account, elaborati, progetti e avanzamento si
 * cancellano o si rendono anonimi entro un mese. Questa schermata e il modo
 * di mantenerle senza scrivere SQL a mano.
 *
 * I passi sono due e restano due. Spegnere gli accessi si puo annullare;
 * cancellare no, e va fatto dopo aver esportato quello che serve tenere.
 * Entrambi chiedono di scrivere la parola CHIUDI: un click distratto su un
 * pulsante rosso non deve bastare a svuotare un anno di lavoro di trecento
 * ragazzi.
 */

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAROLA = "CHIUDI";
const GIORNI_PER_CANCELLARE = 30;

type Conteggi = {
  adesioni: number;
  iscrizioni: number;
  squadre: number;
  progetti: number;
  valutazioni: number;
  commissari: number;
  riflessioni: number;
};

type Piano = {
  conteggi: Conteggi;
  account: {
    totali: number;
    da_cancellare: number;
    mantenuti: number;
    mantenuti_per_motivo: Record<string, number>;
  };
  tabelle_assenti: string[];
};

type Esito = Conteggi & {
  account_cancellati: number;
  account_mantenuti: number;
  mantenuti_per_motivo: Record<string, number>;
};

type Chiusura = { chiusoAt: string | null; cancellatiAt: string | null; esito: Esito | null };

const VOCI: { chiave: keyof Conteggi; label: string }[] = [
  { chiave: "adesioni", label: "Adesioni degli istituti" },
  { chiave: "iscrizioni", label: "Iscrizioni degli studenti" },
  { chiave: "squadre", label: "Squadre" },
  { chiave: "progetti", label: "Progetti" },
  { chiave: "valutazioni", label: "Schede di valutazione" },
  { chiave: "commissari", label: "Commissari" },
  { chiave: "riflessioni", label: "Riflessioni delle lezioni" },
];

function dataOra(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}, ore ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

function soloData(d: Date): string {
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function Numeri({ conteggi, account }: { conteggi: Conteggi; account: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {VOCI.map((v) => (
        <div key={v.chiave} className="card-sm" style={{ padding: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-dark)" }}>{conteggi[v.chiave]}</div>
          <div style={{ fontSize: 12, color: "var(--text-light)" }}>{v.label}</div>
        </div>
      ))}
      <div className="card-sm" style={{ padding: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-dark)" }}>{account}</div>
        <div style={{ fontSize: 12, color: "var(--text-light)" }}>Account di accesso</div>
      </div>
    </div>
  );
}

function Mantenuti({ totale, perMotivo }: { totale: number; perMotivo: Record<string, number> }) {
  if (totale === 0) return null;
  return (
    <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: 0 }}>
      {totale === 1 ? "1 account resta" : `${totale} account restano`}, perché usati anche fuori
      dal percorso:{" "}
      {Object.entries(perMotivo)
        .map(([motivo, n]) => `${motivo.toLowerCase()} (${n})`)
        .join(", ")}
      . Di queste persone si cancellano i dati del percorso, non l&apos;account.
    </p>
  );
}

export function ChiusuraPanel() {
  const [chiusura, setChiusura] = useState<Chiusura | null>(null);
  const [piano, setPiano] = useState<Piano | null>(null);
  const [errorePiano, setErrorePiano] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [conferma, setConferma] = useState("");

  const carica = useCallback(async () => {
    setLoading(true);
    setErrore(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/chiusura", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");
      setChiusura(data.chiusura ?? null);
      setPiano(data.piano ?? null);
      setErrorePiano(data.errore_piano ?? null);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Caricamento non riuscito.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  const esegui = async (azione: "disattiva" | "riattiva" | "cancella", messaggio: string) => {
    setOccupato(true);
    setErrore(null);
    setAvviso(null);
    try {
      const res = await fetch("/api/eventi/licei/admin/chiusura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione, conferma }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operazione non riuscita.");
      setAvviso(messaggio);
      setConferma("");
      await carica();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Operazione non riuscita.");
      await carica();
    } finally {
      setOccupato(false);
    }
  };

  if (loading && !chiusura) return <p className="text-gray-600">Caricamento…</p>;

  const chiuso = !!chiusura?.chiusoAt;
  const cancellato = !!chiusura?.cancellatiAt;
  const parolaOk = conferma.trim() === PAROLA;
  const entro = chiusura?.chiusoAt
    ? new Date(new Date(chiusura.chiusoAt).getTime() + GIORNI_PER_CANCELLARE * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Chiusura del percorso</h1>
        <p className="text-sm text-gray-600">
          Gli impegni dell&apos;informativa privacy, da mantenere a fine corso
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

      {/* ── Esito, a operazione fatta ── */}
      {cancellato && chiusura?.cancellatiAt && (
        <div className="card" style={{ padding: 18 }}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="font-semibold text-gray-800 m-0" style={{ fontSize: 15 }}>
              Dati cancellati il {dataOra(chiusura.cancellatiAt)}
            </h2>
            <span className="badge" style={{ background: "#0A7A661A", color: "#0A7A66" }}>
              Percorso chiuso
            </span>
          </div>
          {chiusura.chiusoAt && (
            <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
              Accessi disattivati il {dataOra(chiusura.chiusoAt)}. Le iscrizioni all&apos;evento e
              gli iscritti alla newsletter non sono stati toccati.
            </p>
          )}
          {chiusura.esito && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Numeri conteggi={chiusura.esito} account={chiusura.esito.account_cancellati} />
              <Mantenuti
                totale={chiusura.esito.account_mantenuti}
                perMotivo={chiusura.esito.mantenuti_per_motivo ?? {}}
              />
            </div>
          )}
        </div>
      )}

      {!cancellato && (
        <div className="card" style={{ padding: 18 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Che cosa succede
          </h2>
          <ol className="text-sm text-gray-600" style={{ lineHeight: 1.8, paddingLeft: 18, margin: "0 0 4px" }}>
            <li>
              <strong>Disattiva gli accessi.</strong> Docenti referenti, studenti e commissari non
              entrano più nelle loro aree e vedono il messaggio &laquo;Il percorso si è concluso e
              l&apos;accesso è stato disattivato.&raquo; Le pagine pubbliche restano come sono. Si
              può annullare finché i dati non sono stati cancellati.
            </li>
            <li>
              <strong>Cancella i dati del percorso.</strong> Si cancellano adesioni, iscrizioni,
              squadre, progetti, schede di valutazione, commissari, le riflessioni delle lezioni
              degli studenti e gli account creati solo per il percorso. Non si può annullare:
              prima esporta classifica, progetti ed elenchi che servono ancora.
            </li>
          </ol>
          <p className="text-sm text-gray-600" style={{ lineHeight: 1.7, margin: "10px 0 0" }}>
            Restano le iscrizioni all&apos;evento finale e gli iscritti alla newsletter, che hanno
            regole proprie. Un account usato anche altrove (staff, portale dei membri, percorso
            universitario, bando startup, evento) resta: se ne cancellano solo i dati del percorso.
          </p>
        </div>
      )}

      {/* ── Anteprima ── */}
      {!cancellato && (
        <div className="card" style={{ padding: 18 }}>
          <h2 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 15 }}>
            Che cosa verrebbe cancellato oggi
          </h2>
          {piano ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
              <Numeri conteggi={piano.conteggi} account={piano.account.da_cancellare} />
              <Mantenuti
                totale={piano.account.mantenuti}
                perMotivo={piano.account.mantenuti_per_motivo}
              />
              {piano.tabelle_assenti.length > 0 && (
                <p style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.7, margin: 0 }}>
                  Tabelle non presenti in questo database, considerate vuote:{" "}
                  {piano.tabelle_assenti.join(", ")}.
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: "#E74C6F", fontSize: 14, margin: "8px 0 0", lineHeight: 1.7 }}>
              Non è stato possibile verificare quali account sono usati anche fuori dal percorso
              {errorePiano ? ` (${errorePiano})` : ""}. Finché la verifica non riesce la
              cancellazione resta bloccata.
            </p>
          )}
        </div>
      )}

      {/* ── Comandi ── */}
      {!cancellato && (
        <div className="card" style={{ padding: 18 }}>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="font-semibold text-gray-800 m-0" style={{ fontSize: 15 }}>
              {chiuso ? "Accessi disattivati" : "Accessi attivi"}
            </h2>
            <span
              className="badge"
              style={{
                background: chiuso ? "#8A61001A" : "#0A7A661A",
                color: chiuso ? "#8A6100" : "#0A7A66",
              }}
            >
              {chiuso ? "Percorso chiuso" : "Percorso in corso"}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4" style={{ lineHeight: 1.7 }}>
            {chiuso && chiusura?.chiusoAt && entro
              ? `Accessi disattivati il ${dataOra(chiusura.chiusoAt)}. L'informativa promette la cancellazione entro un mese: da completare entro il ${soloData(entro)}.`
              : "Da fare il giorno in cui il corso si conclude. La cancellazione si abilita dopo."}
          </p>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-light)",
              maxWidth: 320,
              marginBottom: 14,
            }}
          >
            Per confermare scrivi {PAROLA}
            <Input
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder={PAROLA}
              autoComplete="off"
            />
          </label>

          <div className="flex flex-wrap gap-3 items-center">
            {!chiuso ? (
              <Button
                type="button"
                disabled={occupato || !parolaOk}
                onClick={() =>
                  esegui(
                    "disattiva",
                    "Accessi disattivati. Referenti, studenti e commissari non entrano più nelle loro aree.",
                  )
                }
              >
                Disattiva gli accessi
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={occupato || !parolaOk || !piano}
                  onClick={() => {
                    if (
                      !confirm(
                        "La cancellazione non si può annullare. Hai esportato tutto quello che serve tenere?",
                      )
                    )
                      return;
                    esegui("cancella", "Dati del percorso cancellati.");
                  }}
                  style={{ background: "#E74C6F", borderColor: "#E74C6F" }}
                >
                  Cancella i dati del percorso
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={occupato || !parolaOk}
                  onClick={() => esegui("riattiva", "Accessi riattivati.")}
                >
                  Riattiva gli accessi
                </Button>
              </>
            )}
            {occupato && (
              <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                Operazione in corso, può richiedere qualche minuto…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
