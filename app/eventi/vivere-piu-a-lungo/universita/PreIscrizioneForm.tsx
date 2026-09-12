"use client";

/**
 * Modulo di pre-iscrizione al bando universitario.
 *
 * Volutamente corto. L'art. 4 elenca molte cose che la candidatura "potrà
 * prevedere", ma le elenca a titolo esemplificativo, e in questa fase serve
 * raccogliere adesioni, non selezionare: chiedere CV, competenze e proposta
 * di progetto adesso costerebbe candidature senza aggiungere informazione
 * utile. Si compila in un paio di minuti.
 *
 * TODO fase 2: quando i team dovranno presentare il progetto servira un
 * secondo modulo, con proposta e CV. Non e questo.
 */

import { useState } from "react";
import Link from "next/link";
import { validateUniversita } from "@/lib/eventi/universita";
import {
  ACCETTAZIONE_BANDO_TESTO,
  AREE_DISCIPLINARI,
  CONSENSO_PRIVACY_UNIVERSITA_TESTO,
  LIVELLI_STUDIO,
  MAX_INTERESSI,
  NOTA_INTERESSI,
} from "./content";

type Stato = "compilazione" | "invio" | "fatto";

const campo: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  fontSize: 15,
  color: "var(--text-dark)",
  background: "#fff",
};

const etichetta: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-dark)",
  marginBottom: 6,
};

function Campo({
  id,
  label,
  obbligatorio,
  children,
}: {
  id: string;
  label: string;
  obbligatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} style={etichetta}>
        {label}
        {obbligatorio ? " *" : ""}
      </label>
      {children}
    </div>
  );
}

function Consenso({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0, accentColor: "var(--primary)" }}
      />
      <span style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-mid)" }}>{children}</span>
    </label>
  );
}

export function PreIscrizioneForm() {
  const [stato, setStato] = useState<Stato>("compilazione");
  const [errore, setErrore] = useState<string | null>(null);
  const [codice, setCodice] = useState<string>("");

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [università, setUniversita] = useState("");
  const [corsoStudi, setCorsoStudi] = useState("");
  const [livello, setLivello] = useState("");
  const [area, setArea] = useState("");
  const [areaAltro, setAreaAltro] = useState("");
  const [interessi, setInteressi] = useState("");
  const [accettaBando, setAccettaBando] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // Honeypot: invisibile a chi legge, irresistibile per i bot. Come nelle
  // altre rotte pubbliche del sito.
  const [website, setWebsite] = useState("");

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    // La stessa funzione che usa la rotta. Un campo vuoto si scopre qui,
    // senza un giro di rete per volta.
    const dati = {
      nome,
      cognome,
      email,
      università,
      corso_studi: corsoStudi,
      livello,
      area,
      area_altro: areaAltro,
      interessi,
      accetta_bando: accettaBando,
      consenso_privacy: privacy,
    };
    const problema = validateUniversita(dati);
    if (problema) {
      setErrore(problema);
      return;
    }

    setStato("invio");

    try {
      const risposta = await fetch("/api/eventi/universita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dati, website }),
      });
      const risposta_dati = await risposta.json();
      if (!risposta.ok) {
        setErrore(risposta_dati?.error ?? "Non è stato possibile inviare la candidatura. Riprova.");
        setStato("compilazione");
        return;
      }
      setCodice(risposta_dati.codice);
      setStato("fatto");
    } catch {
      setErrore("Non e stato possibile contattare il server. Controlla la connessione e riprova.");
      setStato("compilazione");
    }
  }

  if (stato === "fatto") {
    return (
      <div className="un-esito" role="status">
        <span className="un-esito-icona" aria-hidden="true">
          <i className="fas fa-circle-check" />
        </span>
        <h3>Candidatura ricevuta</h3>
        <p>
          Ti abbiamo inviato una email di conferma. Il codice della tua candidatura e{" "}
          <strong>{codice}</strong>.
        </p>
        <p className="un-esito-nota">
          Le modalità operative e i termini saranno comunicati sui canali ufficiali. Ricorda che
          candidarsi al bando e iscriversi alla giornata del 10 dicembre sono due cose distinte.
        </p>
      </div>
    );
  }

  const inCorso = stato === "invio";

  return (
    <form onSubmit={invia} className="un-form" noValidate>
      <div className="un-form-griglia">
        <Campo id="un-nome" label="Nome" obbligatorio>
          <input
            id="un-nome"
            style={campo}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            required
          />
        </Campo>
        <Campo id="un-cognome" label="Cognome" obbligatorio>
          <input
            id="un-cognome"
            style={campo}
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            autoComplete="family-name"
            required
          />
        </Campo>
      </div>

      <Campo id="un-email" label="Email" obbligatorio>
        <input
          id="un-email"
          type="email"
          style={campo}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Campo>

      <div className="un-form-griglia">
        <Campo id="un-università" label="Università" obbligatorio>
          <input
            id="un-università"
            style={campo}
            value={università}
            onChange={(e) => setUniversita(e.target.value)}
            placeholder="Anche straniera"
            required
          />
        </Campo>
        <Campo id="un-corso" label="Corso di studi" obbligatorio>
          <input
            id="un-corso"
            style={campo}
            value={corsoStudi}
            onChange={(e) => setCorsoStudi(e.target.value)}
            required
          />
        </Campo>
      </div>

      <div className="un-form-griglia">
        <Campo id="un-livello" label="Livello" obbligatorio>
          <select
            id="un-livello"
            style={campo}
            value={livello}
            onChange={(e) => setLivello(e.target.value)}
            required
          >
            <option value="">Scegli</option>
            {LIVELLI_STUDIO.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="un-area" label="Area disciplinare" obbligatorio>
          <select
            id="un-area"
            style={campo}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          >
            <option value="">Scegli</option>
            {AREE_DISCIPLINARI.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {area === "altro" && (
        <Campo id="un-area-altro" label="Quale area" obbligatorio>
          <input
            id="un-area-altro"
            style={campo}
            value={areaAltro}
            onChange={(e) => setAreaAltro(e.target.value)}
            required
          />
        </Campo>
      )}

      <Campo id="un-interessi" label="Interessi di ricerca">
        <input
          id="un-interessi"
          style={campo}
          value={interessi}
          maxLength={MAX_INTERESSI}
          onChange={(e) => setInteressi(e.target.value)}
        />
        <p className="un-form-aiuto">{NOTA_INTERESSI}</p>
      </Campo>

      <div className="un-consensi">
        <Consenso checked={accettaBando} onChange={setAccettaBando}>
          {ACCETTAZIONE_BANDO_TESTO} *
        </Consenso>
        <Consenso checked={privacy} onChange={setPrivacy}>
          {CONSENSO_PRIVACY_UNIVERSITA_TESTO} *{" "}
          <Link href="/legal/informativa-privacy" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Leggi l&apos;informativa
          </Link>
        </Consenso>
      </div>

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="un-website">Non compilare questo campo</label>
        <input
          id="un-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(ev) => setWebsite(ev.target.value)}
        />
      </div>

      {errore && (
        <div className="un-errore" role="alert">
          <i className="fas fa-circle-exclamation" aria-hidden="true" /> {errore}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={inCorso} style={{ width: "100%" }}>
        {inCorso ? "Invio in corso..." : "Invia la candidatura"}
      </button>
    </form>
  );
}
