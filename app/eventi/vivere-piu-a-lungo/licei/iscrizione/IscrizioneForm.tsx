"use client";

/**
 * Iscrizione dello studente al percorso.
 *
 * Un passo solo, cinque campi. Chi lo compila ha sedici anni, arriva da una
 * circolare letta in classe e non ha nessuna ragione di leggere un bando:
 * ogni campo in piu qui e uno studente in meno che arriva in fondo.
 *
 * Il codice dell'istituto e la prima cosa richiesta perche e l'unica che
 * puo mancare davvero. Se e sbagliato conviene dirlo subito, non dopo che ha
 * compilato tutto il resto.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ANNI_CORSO,
  CONSENSO_PRIVACY_STUDENTE_TESTO,
  DICHIARAZIONE_AUTORIZZAZIONE_TESTO,
  LICEI,
  NOTA_ISCRIZIONE_STUDENTE,
} from "../content";
import { normalizzaCodice, validateIscrizione } from "@/lib/eventi/licei-iscrizioni";

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
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        cursor: "pointer",
        fontSize: 13,
        color: "var(--text-mid)",
        lineHeight: 1.65,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "var(--primary)", flexShrink: 0 }}
      />
      <span>{children}</span>
    </label>
  );
}

export function IscrizioneForm({
  codiceIniziale = "",
  anteprimaStaff = false,
}: {
  codiceIniziale?: string;
  anteprimaStaff?: boolean;
}) {
  const [codice, setCodice] = useState(codiceIniziale);
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [classe, setClasse] = useState("");
  const [anno, setAnno] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [autorizzazione, setAutorizzazione] = useState(false);
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ istituto: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setEmail((v) => v || user.email!);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      codice,
      nome,
      cognome,
      email,
      classe,
      anno_corso: Number(anno),
      consenso_privacy: privacy,
      dichiara_autorizzazione: autorizzazione,
      website,
    };

    const errore = validateIscrizione(payload);
    if (errore) {
      setError(errore);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/eventi/licei/iscrizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Iscrizione non riuscita.");
      setSuccess({ istituto: data.istituto ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Iscrizione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
        <div
          className="icon-circle icon-circle-primary"
          style={{ width: 56, height: 56, marginBottom: 16 }}
        >
          <i className="fas fa-check text-2xl" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-800">Ci sei</h3>
        <p className="text-gray-600 mb-5">
          La tua iscrizione è arrivata{success.istituto ? `, tramite ${success.istituto}` : ""}. Ti
          abbiamo mandato un&apos;email con i prossimi passi.
        </p>
        <div
          style={{
            background: "#FFF8E6",
            border: "1px solid #F0D89B",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 13.5,
            color: "#75570F",
            lineHeight: 1.65,
          }}
        >
          <strong>Due cose, adesso.</strong> Se sei minorenne, chiedi al tuo docente referente il
          modulo di autorizzazione, fallo firmare a un genitore e riportaglielo. Poi aspetta che il
          referente confermi la tua iscrizione: te lo diciamo per email.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      {anteprimaStaff && (
        <div
          style={{
            background: "#FFF8E6",
            border: "1px solid #F0D89B",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#8A6100",
          }}
        >
          <strong>Anteprima staff.</strong> Le iscrizioni risultano chiuse. Quello che invii da qui
          finisce davvero nel database.
        </div>
      )}

      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="isc-website">Sito web</label>
        <input
          id="isc-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="codice" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
          Codice del tuo istituto *
        </Label>
        <p style={{ fontSize: 12, color: "var(--text-light)", margin: 0, lineHeight: 1.5 }}>
          Te lo dà il tuo docente referente. È nel formato LIC- seguito da otto caratteri.
        </p>
        <Input
          id="codice"
          value={codice}
          onChange={(e) => setCodice(normalizzaCodice(e.target.value))}
          placeholder="LIC-XXXXXXXX"
          style={{ fontFamily: "monospace", letterSpacing: "0.08em", fontSize: 16 }}
        />
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="nome" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
            Nome *
          </Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cognome" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
            Cognome *
          </Label>
          <Input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
          Email *
        </Label>
        <p style={{ fontSize: 12, color: "var(--text-light)", margin: 0, lineHeight: 1.5 }}>
          Ti serve per accedere alle lezioni. Usa un indirizzo che leggi davvero.
        </p>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="classe" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
            Classe *
          </Label>
          <Input
            id="classe"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            placeholder="Es. 4A"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="anno" style={{ fontWeight: 600, color: "var(--text-dark)" }}>
            Anno di corso *
          </Label>
          <select
            id="anno"
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
            style={{
              height: 40,
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              padding: "0 10px",
              background: "#fff",
              color: "var(--text-dark)",
              fontSize: 14,
            }}
          >
            <option value="">Scegli</option>
            {ANNI_CORSO.map((a) => (
              <option key={a.anno} value={a.anno}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          background: "#F4F8FF",
          border: "1px solid #D6E4FA",
          borderRadius: 10,
          padding: 14,
          fontSize: 13,
          color: "#28456F",
          lineHeight: 1.65,
        }}
      >
        {NOTA_ISCRIZIONE_STUDENTE}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Consenso checked={autorizzazione} onChange={setAutorizzazione}>
          {DICHIARAZIONE_AUTORIZZAZIONE_TESTO} *
        </Consenso>
        <Consenso checked={privacy} onChange={setPrivacy}>
          {CONSENSO_PRIVACY_STUDENTE_TESTO} *{" "}
          <Link href="/legal/privacy" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            Leggi l&apos;informativa
          </Link>
        </Consenso>
      </div>

      {error && (
        <p style={{ color: "#E74C6F", fontSize: 14, margin: 0, lineHeight: 1.6 }} role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Invio in corso…" : "Iscrivimi al percorso"}
      </Button>

      <p
        style={{
          fontSize: 12,
          color: "var(--text-light)",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Il percorso è gratuito, online e fuori dall&apos;orario scolastico. Si chiude il{" "}
        {LICEI.dataLabel.toLowerCase()} al {LICEI.luogo}.
      </p>
    </form>
  );
}
