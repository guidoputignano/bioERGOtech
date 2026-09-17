"use client";

/**
 * Modulo di candidatura a mentor del percorso universitario.
 *
 * Piu lungo del modulo degli studenti, e di proposito. Li si raccolgono
 * adesioni e ogni campo in piu e una candidatura in meno; qui si raccoglie
 * quello che serve a decidere e ad abbinare: senza le aree e senza il tempo
 * che una persona puo dare davvero, la direzione scientifica ha in mano un
 * nome e nient'altro, e l'abbinamento con un team torna a essere una
 * telefonata.
 *
 * Il registro e il lei, come le due email dei mentor e come i testi della
 * pagina. Le rotte degli studenti restano al tu: sono due pubblici diversi.
 */

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateMentor, type MentorInput } from "@/lib/eventi/universita-mentor";
import {
  AREE_DISCIPLINARI,
  CONSENSO_PRIVACY_MENTOR_TESTO,
  CONSENSO_PUBBLICAZIONE_MENTOR_TESTO,
  CONTATTI_UNIVERSITA,
  DISPONIBILITA_MENTOR,
  MENTOR_BIO_MAX,
  MENTOR_COMPETENZE_MAX,
  MENTOR_NOTA_TELEFONO,
  MENTOR_PATH,
  RUOLI_MENTOR,
} from "../content";

type Stato = "compilazione" | "invio" | "fatto";

/**
 * Il tetto delle aree non ha una costante in `content.ts`: sta scritto
 * dentro `validateMentor`, che e il posto in cui viene fatto rispettare sul
 * serio. Qui serve solo per spegnere le pillole in eccesso prima del clic,
 * cosi chi compila non scopre il limite da un messaggio di errore dopo aver
 * scelto la settima.
 */
const AREE_MAX = 6;

const boxStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  background: "#fff",
  color: "var(--text-dark)",
};

const selectStyle: React.CSSProperties = {
  ...boxStyle,
  height: 40,
  padding: "0 10px",
};

const aiutoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-light)",
  margin: "3px 0 0",
  lineHeight: 1.55,
};

const contatoreStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-light)",
  textAlign: "right",
};

/**
 * Il riquadro ambra del modulo. Sta qui una volta sola perche compare in due
 * punti che dicono la stessa cosa con parole diverse: un avviso che cambia
 * colore fra due schede sembra un altro tipo di avviso.
 */
const NOTA_ATTESA: React.CSSProperties = {
  background: "#FFF8E6",
  border: "1px solid #F0D89B",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 13.5,
  color: "#75570F",
  lineHeight: 1.6,
};

const NOTA_OK: React.CSSProperties = {
  background: "#ECFAF6",
  border: "1px solid #B4E3D8",
  borderRadius: 10,
  padding: "12px 16px",
  fontSize: 14,
  color: "#08594A",
};

function Campo({
  id,
  label,
  obbligatorio,
  aiuto,
  children,
}: {
  id: string;
  label: string;
  obbligatorio?: boolean;
  aiuto?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div>
        <Label htmlFor={id} style={{ fontWeight: 600, color: "var(--text-dark)" }}>
          {label}
          {obbligatorio ? " *" : ""}
        </Label>
        {aiuto && <p style={aiutoStyle}>{aiuto}</p>}
      </div>
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

export function MentorForm() {
  const [stato, setStato] = useState<Stato>("compilazione");
  const [errore, setErrore] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [organizzazione, setOrganizzazione] = useState("");
  const [aree, setAree] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [competenze, setCompetenze] = useState("");
  const [disponibilita, setDisponibilita] = useState("");
  const [sito, setSito] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [pubblicazione, setPubblicazione] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // Honeypot: invisibile a chi legge, irresistibile per i bot. La rotta
  // risponde con lo stesso successo di un invio buono, quindi da qui non si
  // capisce che il campo e una trappola.
  const [website, setWebsite] = useState("");

  // Lo stato dell'ultimo invio riuscito, non quello del riquadro: la
  // schermata finale dice una cosa diversa a chi ha dato il consenso alla
  // pubblicazione e a chi non lo ha dato, e leggerlo dallo stato vivo
  // significherebbe raccontare l'invio precedente se qualcuno tocca la
  // casella dopo.
  const [pubblicato, setPubblicato] = useState(false);

  function toggleArea(valore: string) {
    setAree((precedenti) =>
      precedenti.includes(valore)
        ? precedenti.filter((a) => a !== valore)
        : precedenti.length >= AREE_MAX
          ? precedenti
          : [...precedenti, valore],
    );
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    const dati: MentorInput = {
      nome,
      cognome,
      email,
      telefono,
      ruolo,
      organizzazione,
      aree,
      bio,
      competenze,
      disponibilita,
      sito,
      linkedin,
      consenso_pubblicazione: pubblicazione,
      consenso_privacy: privacy,
    };

    // La stessa funzione che usa la rotta. Un campo mancante si scopre qui,
    // senza un giro di rete per volta, e il messaggio e identico a quello che
    // tornerebbe dal server: due formulazioni diverse per lo stesso errore
    // farebbero sembrare che siano due errori.
    const problema = validateMentor(dati);
    if (problema) {
      setErrore(problema);
      return;
    }

    setStato("invio");

    try {
      const risposta = await fetch("/api/eventi/universita/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dati, website }),
      });
      const corpo = await risposta.json();
      if (!risposta.ok) {
        // Canale unico, anche per il 409 del doppio invio: quel messaggio e
        // gia una frase in italiano che dice che cosa fare, e mostrarlo come
        // guasto tecnico spingerebbe a ricompilare tutto per riottenerlo.
        setErrore(corpo?.error ?? "Non è stato possibile inviare la candidatura. Riprovi.");
        setStato("compilazione");
        return;
      }
      setPubblicato(pubblicazione);
      setStato("fatto");
    } catch {
      setErrore(
        "Non è stato possibile contattare il server. Controlli la connessione e riprovi.",
      );
      setStato("compilazione");
    }
  }

  if (stato === "fatto") {
    return (
      <div className="card" style={{ borderTop: "4px solid var(--primary)" }} role="status">
        <div
          className="icon-circle icon-circle-primary"
          style={{ width: 56, height: 56, marginBottom: 16 }}
        >
          <i className="fas fa-check text-2xl" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Candidatura ricevuta</h2>
        <p className="text-gray-600 mb-5">
          Le abbiamo mandato una email di conferma. La candidatura la legge la direzione
          scientifica della Fondazione, e se viene accolta le scriviamo per concordare
          l&apos;abbinamento con un team.
        </p>

        <div style={NOTA_OK}>
          Nessun mentor viene assegnato a un team senza saperlo, e nessun team si trova un mentor
          che non ha mai visto.
        </div>

        {!pubblicato && (
          <div style={{ ...NOTA_ATTESA, marginTop: 14 }}>
            Non ha dato il consenso alla pubblicazione, quindi non comparirà nella pagina pubblica
            dei mentor. Non incide sulla candidatura. Se cambia idea basta scriverlo a{" "}
            {CONTATTI_UNIVERSITA.fondazione.email}.
          </div>
        )}

        <p style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.7, margin: "16px 0 0" }}>
          Nel frattempo, l&apos;elenco dei mentor del percorso è{" "}
          <Link href={MENTOR_PATH} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            a questa pagina
          </Link>
          .
        </p>
      </div>
    );
  }

  const inCorso = stato === "invio";
  const areePiene = aree.length >= AREE_MAX;

  return (
    <form
      onSubmit={invia}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
      noValidate
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="mn-nome" label="Nome" obbligatorio>
          <Input
            id="mn-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
          />
        </Campo>
        <Campo id="mn-cognome" label="Cognome" obbligatorio>
          <Input
            id="mn-cognome"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            autoComplete="family-name"
          />
        </Campo>
      </div>

      <Campo id="mn-email" label="Email" obbligatorio>
        <Input
          id="mn-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Campo>

      <Campo id="mn-telefono" label="Telefono" aiuto={MENTOR_NOTA_TELEFONO}>
        <Input
          id="mn-telefono"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
        />
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="mn-ruolo" label="Ruolo" obbligatorio>
          <select
            id="mn-ruolo"
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value)}
            style={selectStyle}
          >
            <option value="">Scegli</option>
            {RUOLI_MENTOR.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          id="mn-organizzazione"
          label="Università, ente o azienda"
          obbligatorio
        >
          <Input
            id="mn-organizzazione"
            value={organizzazione}
            onChange={(e) => setOrganizzazione(e.target.value)}
            autoComplete="organization"
          />
        </Campo>
      </div>

      {/* ── Aree ──
          Le stesse aree con cui si descrivono i candidati, non un campo
          libero: e quel vocabolario condiviso che permette di abbinare un
          mentor a un team invece di leggere trenta schede a mano. */}
      <div className="grid gap-2" role="group" aria-labelledby="mn-aree-label">
        <div>
          <span
            id="mn-aree-label"
            style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: 14 }}
          >
            Aree disciplinari *
          </span>
          <p style={aiutoStyle}>
            Quelle su cui può dare un parere utile a un team, al massimo {AREE_MAX}. Sono le stesse
            aree con cui si descrivono i candidati: è quello che permette di abbinarla a un
            progetto.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AREE_DISCIPLINARI.map((a) => {
            const scelta = aree.includes(a.value);
            const spenta = areePiene && !scelta;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleArea(a.value)}
                disabled={spenta}
                aria-pressed={scelta}
                style={{
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontSize: 13,
                  lineHeight: 1.4,
                  cursor: spenta ? "not-allowed" : "pointer",
                  opacity: spenta ? 0.45 : 1,
                  background: scelta ? "var(--primary-light)" : "#fff",
                  border: `1px solid ${scelta ? "var(--primary)" : "var(--border-color)"}`,
                  color: scelta ? "var(--primary-dark)" : "var(--text-mid)",
                  fontWeight: scelta ? 600 : 400,
                  transition: "background .2s ease, border-color .2s ease",
                }}
              >
                {scelta && <i className="fas fa-check" style={{ marginRight: 7, fontSize: 11 }} aria-hidden="true" />}
                {a.label}
              </button>
            );
          })}
        </div>
        <div style={contatoreStyle}>
          {aree.length} / {AREE_MAX}
        </div>
      </div>

      <Campo
        id="mn-bio"
        label="Breve profilo"
        obbligatorio
        aiuto="Due righe: di che cosa si occupa e che cosa porta a un team. È il testo che compare nella pagina pubblica, se dà il consenso."
      >
        <textarea
          id="mn-bio"
          value={bio}
          rows={5}
          maxLength={MENTOR_BIO_MAX}
          onChange={(e) => setBio(e.target.value)}
          style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={contatoreStyle}>
          {bio.length} / {MENTOR_BIO_MAX}
        </div>
      </Campo>

      <Campo
        id="mn-competenze"
        label="Competenze specifiche"
        aiuto="Metodi, tecniche, strumenti. Serve allo staff per l'abbinamento e non compare nella pagina pubblica, che riporta solo quello che il consenso elenca."
      >
        <textarea
          id="mn-competenze"
          value={competenze}
          rows={3}
          maxLength={MENTOR_COMPETENZE_MAX}
          onChange={(e) => setCompetenze(e.target.value)}
          style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
        />
        <div style={contatoreStyle}>
          {competenze.length} / {MENTOR_COMPETENZE_MAX}
        </div>
      </Campo>

      <Campo
        id="mn-disponibilita"
        label="Tempo che può dare"
        obbligatorio
        aiuto="Anche un solo incontro è utile. Quello che non funziona è una disponibilità dichiarata e mai trovata."
      >
        <select
          id="mn-disponibilita"
          value={disponibilita}
          onChange={(e) => setDisponibilita(e.target.value)}
          style={selectStyle}
        >
          <option value="">Scegli</option>
          {DISPONIBILITA_MENTOR.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="mn-sito" label="Sito o pagina istituzionale">
          <Input
            id="mn-sito"
            type="url"
            value={sito}
            placeholder="https://"
            onChange={(e) => setSito(e.target.value)}
          />
        </Campo>
        <Campo id="mn-linkedin" label="LinkedIn">
          <Input
            id="mn-linkedin"
            type="url"
            value={linkedin}
            placeholder="https://"
            onChange={(e) => setLinkedin(e.target.value)}
          />
        </Campo>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 13, paddingTop: 4 }}>
        <Consenso checked={pubblicazione} onChange={setPubblicazione}>
          {CONSENSO_PUBBLICAZIONE_MENTOR_TESTO}{" "}
          <strong style={{ color: "var(--text-dark)" }}>(facoltativo)</strong>
        </Consenso>
        {/* Approvata e pubblicata sono due cose distinte, e chi compila non
            ha modo di saperlo: senza questa riga la casella sembra un passo
            obbligato e chi non la vuole spuntare rinuncia del tutto. */}
        <p style={{ ...aiutoStyle, margin: "-6px 0 0 28px" }}>
          Si può essere mentor del percorso senza comparire nella pagina pubblica. Il consenso non
          incide sulla valutazione della candidatura e si può dare o ritirare anche dopo.
        </p>

        <Consenso checked={privacy} onChange={setPrivacy}>
          {CONSENSO_PRIVACY_MENTOR_TESTO} *{" "}
          <Link
            href="/legal/informativa-privacy"
            style={{ color: "var(--primary-dark)", fontWeight: 600 }}
          >
            Leggi l&apos;informativa
          </Link>
        </Consenso>
      </div>

      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label htmlFor="mn-website">Non compilare questo campo</label>
        <input
          id="mn-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {errore && (
        <p style={{ color: "#E74C6F", fontSize: 14, margin: 0, lineHeight: 1.6 }} role="alert">
          {errore}
        </p>
      )}

      <Button type="submit" disabled={inCorso}>
        {inCorso ? "Invio in corso..." : "Invia la candidatura"}
      </Button>
    </form>
  );
}
