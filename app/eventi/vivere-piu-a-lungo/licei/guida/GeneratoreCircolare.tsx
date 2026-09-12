"use client";

/**
 * Il testo della circolare, gia pronto, a partire dal codice dell'istituto.
 *
 * Esiste perche il punto in cui si perde piu gente non e il modulo: e il
 * passaggio fra l'email che riceve il docente e il messaggio che scrive alla
 * classe. Li deve capire da solo la differenza fra il codice e il link che lo
 * contiene, e chi diffonde il codice nudo costringe trenta ragazzi a
 * digitarlo, con la percentuale di errori che ne segue.
 *
 * Qui incolla il codice e copia un testo finito. Il calcolo avviene nel suo
 * browser: il codice non viene inviato da nessuna parte, e infatti questo
 * componente non chiama nessuna rotta.
 */

import { useState } from "react";
import { ISCRIZIONE_PATH, LICEI, SITE_URL } from "../content";

function componiTesto(codice: string): string {
  const link = `${SITE_URL}${ISCRIZIONE_PATH}?codice=${encodeURIComponent(codice)}`;
  return [
    `Oggetto: percorso gratuito su ${LICEI.titolo}`,
    "",
    "Il nostro istituto ha aderito al percorso formativo gratuito su biotecnologie e",
    "intelligenza artificiale promosso da Fondazione bioERGOtech e SafesPro, rivolto agli",
    `studenti del triennio. Si svolge online e fuori dall'orario scolastico, e si chiude`,
    `${LICEI.dataLabel.toLowerCase()}, al ${LICEI.luogo}, con la presentazione dei`,
    `${LICEI.progettiSulPalco} progetti migliori della provincia.`,
    "",
    "Chi vuole partecipare si iscrive da questo indirizzo, che contiene già il codice del",
    "nostro istituto:",
    "",
    link,
    "",
    "Servono solo nome, cognome, un indirizzo email che leggete davvero, la classe e",
    "l'anno di corso. Subito dopo l'iscrizione riceverete un messaggio con il link per",
    "impostare la password: apritelo subito, perché senza password le lezioni non si",
    "aprono.",
    "",
    "Le iscrizioni le confermo io una per una, quindi iscrivetevi con il vostro nome vero.",
    "Per qualsiasi dubbio potete rivolgervi a me.",
  ].join("\n");
}

export function GeneratoreCircolare() {
  const [codice, setCodice] = useState("");
  const [testo, setTesto] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState("");

  const genera = () => {
    const pulito = codice.trim().toUpperCase().replace(/\s+/g, "");
    if (!pulito) {
      setTesto(null);
      setErrore("Scriva il codice del suo istituto, quello che comincia per LIC-.");
      return;
    }
    if (!pulito.startsWith("LIC-")) {
      setTesto(null);
      setErrore(
        "Il codice di un istituto comincia sempre per LIC-. Lo trova nell'email di conferma e in cima alla sua area riservata.",
      );
      return;
    }
    setErrore(null);
    setCodice(pulito);
    setTesto(componiTesto(pulito));
    setEsito("");
  };

  const copia = async () => {
    if (!testo) return;
    try {
      await navigator.clipboard.writeText(testo);
      setEsito("Testo copiato.");
    } catch {
      // Senza permesso sugli appunti resta il modo di sempre, e va detto
      // invece di lasciare il bottone muto.
      setEsito("Non sono riuscito a copiare. Selezioni il testo qui sopra e usi Ctrl+C.");
    }
  };

  return (
    <div className="card" style={{ padding: 26 }}>
      <h3 className="font-semibold text-gray-800 mb-1" style={{ fontSize: 17 }}>
        Il testo della circolare, pronto
      </h3>
      <p className="lc-nota" style={{ marginBottom: 16 }}>
        Scriva il codice del suo istituto e copi il testo che compare. Il calcolo avviene in
        questa pagina: il codice non viene inviato a nessuno.
      </p>

      <div className="flex flex-wrap gap-3 items-end" style={{ marginBottom: 14 }}>
        <label style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="lc-kicker">Codice dell&apos;istituto</span>
          <input
            id="gd-codice"
            type="text"
            value={codice}
            onChange={(e) => setCodice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                genera();
              }
            }}
            placeholder="LIC-XXXXXXXX"
            autoComplete="off"
            spellCheck={false}
            style={{
              fontFamily: "monospace",
              fontSize: 15,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "11px 13px",
              borderRadius: 9,
              border: "1px solid var(--border-color)",
              background: "#fff",
              width: "100%",
            }}
          />
        </label>
        <button type="button" className="btn-primary" onClick={genera} style={{ height: 44 }}>
          Genera il testo
        </button>
      </div>

      {errore && (
        <p style={{ color: "#B44A5E", fontSize: 13.5, lineHeight: 1.7 }}>{errore}</p>
      )}

      {testo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "inherit",
              fontSize: 14.5,
              lineHeight: 1.7,
              color: "var(--text-mid)",
              background: "#F8FAFB",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            {testo}
          </pre>
          <div className="flex flex-wrap gap-3 items-center">
            <button type="button" className="btn-outline" onClick={copia} style={{ fontSize: 14 }}>
              Copia negli appunti
            </button>
            <span aria-live="polite" style={{ fontSize: 13, color: "var(--text-light)" }}>
              {esito}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
