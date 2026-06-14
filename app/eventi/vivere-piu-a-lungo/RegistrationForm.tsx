"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  SESSIONS,
  CATEGORIE,
  CONSENSO_PRIVACY_TESTO,
  CONSENSO_MARKETING_TESTO,
  EVENT_SLUG,
  type SessionSlug,
} from "./content";
import type { SessionStatus } from "@/lib/eventi/registration";

type Seat = { slug: string; capienza_max: number; confermati: number; rimanenti: number };

const inputStyle: React.CSSProperties = {};

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <Label htmlFor={htmlFor} style={{ fontWeight: 600, color: "#1A2332" }}>
      {children}
    </Label>
  );
}

function RegistrationFormInner() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("cat") ?? "";

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [categoria, setCategoria] = useState(initialCat);
  const [organizzazione, setOrganizzazione] = useState("");
  const [classe, setClasse] = useState("");
  const [startupName, setStartupName] = useState("");
  const [startupUrl, setStartupUrl] = useState("");
  const [startupDesc, setStartupDesc] = useState("");
  const [referente, setReferente] = useState("");
  const [note, setNote] = useState("");
  const [sessioni, setSessioni] = useState<SessionSlug[]>([]);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [consensoMarketing, setConsensoMarketing] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [seats, setSeats] = useState<Record<string, Seat>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<
    { codice: string; sessions: { slug: string; status: SessionStatus }[] } | null
  >(null);

  // Precompila i dati se l'utente è già loggato nel Member Portal.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (user.email) setEmail(user.email);
        const fullName = (user.user_metadata?.full_name as string) ?? "";
        const parts = fullName.split(" ");
        if (parts[0]) setNome(parts[0]);
        if (parts.length > 1) setCognome(parts.slice(1).join(" "));
      }
    })();
  }, []);

  // Posti rimanenti live.
  const loadSeats = async () => {
    try {
      const res = await fetch("/api/eventi/seats", { cache: "no-store" });
      const data = await res.json();
      const map: Record<string, Seat> = {};
      for (const s of data.seats ?? []) map[s.slug] = s;
      setSeats(map);
    } catch {
      /* il contatore e un di piu, non blocca l'iscrizione */
    }
  };
  useEffect(() => {
    loadSeats();
  }, []);

  const showClasse = categoria === "studente" || categoria === "scuola_docente";
  const showStartup = categoria === "startup" || categoria === "investitore_partner";

  const toggleSessione = (slug: SessionSlug) => {
    setSessioni((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const canSubmit = useMemo(
    () =>
      nome.trim() &&
      cognome.trim() &&
      email.trim() &&
      categoria &&
      sessioni.length > 0 &&
      consensoPrivacy &&
      !loading,
    [nome, cognome, email, categoria, sessioni, consensoPrivacy, loading],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/eventi/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          cognome,
          email,
          telefono,
          categoria,
          organizzazione,
          classe,
          startup_name: startupName,
          startup_url: startupUrl,
          startup_desc: startupDesc,
          referente,
          note,
          sessioni,
          consenso_privacy: consensoPrivacy,
          consenso_marketing: consensoMarketing,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Iscrizione non riuscita.");
      setSuccess({ codice: data.codice, sessions: data.sessions ?? [] });
      loadSeats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Iscrizione non riuscita.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const hasWaitlist = success.sessions.some((s) => s.status === "lista_attesa");
    return (
      <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
        <div
          className="icon-circle icon-circle-primary"
          style={{ width: 56, height: 56, marginBottom: 16 }}
        >
          <i className="fas fa-check text-2xl" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-800">Iscrizione confermata</h3>
        <p className="text-gray-600 mb-6">
          Ti abbiamo inviato un&apos;email di conferma con il codice e il QR per il check-in.
          {hasWaitlist
            ? " Alcune sessioni erano al completo: sei in lista d'attesa e ti avviseremo se si libera un posto."
            : ""}
        </p>
        <div
          style={{
            background: "var(--primary-light)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)", marginBottom: 6 }}>
            Il tuo codice di check-in
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
              color: "#1A2332",
            }}
          >
            {success.codice}
          </div>
        </div>
        <Link
          href={`/eventi/${EVENT_SLUG}/biglietto/${success.codice}`}
          className="btn-primary inline-block"
        >
          Apri il tuo biglietto →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Honeypot: invisibile agli umani, riempito dai bot. */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="website">Sito web</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <FieldLabel htmlFor="nome">Nome *</FieldLabel>
          <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="cognome">Cognome *</FieldLabel>
          <Input id="cognome" required value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <FieldLabel htmlFor="email">Email *</FieldLabel>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <FieldLabel htmlFor="telefono">Telefono</FieldLabel>
          <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor="categoria">Categoria *</FieldLabel>
        <select
          id="categoria"
          required
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{
            height: 40,
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            padding: "0 12px",
            background: "#fff",
            color: "#1A2332",
            fontSize: 14,
          }}
        >
          <option value="">Seleziona…</option>
          {CATEGORIE.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {(showClasse || categoria) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <FieldLabel htmlFor="organizzazione">Scuola / Organizzazione</FieldLabel>
            <Input id="organizzazione" value={organizzazione} onChange={(e) => setOrganizzazione(e.target.value)} />
          </div>
          {showClasse && (
            <div className="grid gap-2">
              <FieldLabel htmlFor="classe">Classe</FieldLabel>
              <Input id="classe" value={classe} onChange={(e) => setClasse(e.target.value)} placeholder="Es. 4A" />
            </div>
          )}
        </div>
      )}

      {showStartup && (
        <div
          style={{
            background: "var(--bg-light)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="startup_name">Nome startup *</FieldLabel>
              <Input id="startup_name" value={startupName} onChange={(e) => setStartupName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="startup_url">Sito / pitch</FieldLabel>
              <Input id="startup_url" value={startupUrl} onChange={(e) => setStartupUrl(e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="startup_desc">Breve descrizione</FieldLabel>
            <textarea
              id="startup_desc"
              value={startupDesc}
              onChange={(e) => setStartupDesc(e.target.value)}
              rows={3}
              style={{ borderRadius: 8, border: "1px solid var(--border-color)", padding: 10, fontSize: 14 }}
            />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="referente">Referente</FieldLabel>
            <Input id="referente" value={referente} onChange={(e) => setReferente(e.target.value)} />
          </div>
        </div>
      )}

      {/* Sessioni iscrivibili con posti rimanenti. */}
      <div className="grid gap-3">
        <FieldLabel htmlFor="sessioni">Sessioni *</FieldLabel>
        <p style={{ fontSize: 13, color: "var(--text-light)", margin: 0 }}>
          Seleziona una o più sessioni a cui vuoi partecipare.
        </p>
        {SESSIONS.map((s) => {
          const seat = seats[s.slug];
          const remaining = seat?.rimanenti;
          const full = remaining !== undefined && remaining <= 0;
          const selected = sessioni.includes(s.slug);
          return (
            <div
              key={s.slug}
              onClick={() => toggleSessione(s.slug)}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggleSessione(s.slug);
                }
              }}
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1.5px solid ${selected ? "var(--primary)" : "var(--border-color)"}`,
                background: selected ? "var(--primary-light)" : "#fff",
                cursor: "pointer",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  border: `2px solid ${selected ? "var(--primary)" : "#CBD5E0"}`,
                  background: selected ? "var(--primary)" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {selected && (
                  <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#1A2332", fontSize: 14 }}>{s.titolo}</div>
                <div style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 2 }}>
                  {s.giornoLabel}, {s.orario} . {s.luogo}
                </div>
                <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                  {remaining === undefined ? (
                    <span style={{ color: "var(--text-light)" }}>Posti disponibili</span>
                  ) : full ? (
                    <span style={{ color: "#B7791F" }}>
                      Al completo . iscriviti in lista d&apos;attesa
                    </span>
                  ) : (
                    <span style={{ color: "var(--primary-dark)" }}>{remaining} posti rimanenti</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor="note">Note</FieldLabel>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{ borderRadius: 8, border: "1px solid var(--border-color)", padding: 10, fontSize: 14 }}
        />
      </div>

      {/* Consensi */}
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "var(--text-mid)" }}>
        <input
          type="checkbox"
          checked={consensoPrivacy}
          onChange={(e) => setConsensoPrivacy(e.target.checked)}
          style={{ marginTop: 3, accentColor: "var(--primary)" }}
          required
        />
        <span>{CONSENSO_PRIVACY_TESTO} *</span>
      </label>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: "var(--text-mid)" }}>
        <input
          type="checkbox"
          checked={consensoMarketing}
          onChange={(e) => setConsensoMarketing(e.target.checked)}
          style={{ marginTop: 3, accentColor: "var(--primary)" }}
        />
        <span>{CONSENSO_MARKETING_TESTO}</span>
      </label>

      {error && <p style={{ color: "#E74C6F", fontSize: 14, margin: 0 }}>{error}</p>}

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {loading ? "Invio in corso…" : "Conferma iscrizione"}
      </Button>
      <p style={{ fontSize: 12, color: "var(--text-light)", margin: 0, textAlign: "center" }}>
        Iscrivendoti crei (o colleghi) un account nel Member Portal della Fondazione.
      </p>
    </form>
  );
}

export function RegistrationForm() {
  return (
    <Suspense fallback={<div className="card">Caricamento…</div>}>
      <RegistrationFormInner />
    </Suspense>
  );
}
