"use client";

/**
 * Modulo di adesione dell'istituto al percorso "Biotecnologie e Intelligenza
 * Artificiale" (art. 4 del bando).
 *
 * Lo compila il docente referente, non lo studente. Tre passi: l'istituto,
 * il referente con i numeri previsti, gli impegni e le dichiarazioni.
 *
 * Nessun dato di studenti viene raccolto qui, solo quanti se ne prevedono per
 * anno di corso. I ragazzi si iscriveranno da soli in una fase successiva, e
 * le autorizzazioni dei genitori restano cartacee e in custodia alla scuola:
 * il sito non le raccoglie e non le conserva.
 *
 * Le primitive del form (etichetta, area di testo, spunta) sono le stesse di
 * BandoForm, deliberatamente duplicate: la pagina del bando e in
 * lavorazione, e condividerle adesso significherebbe toccarla. Vanno estratte
 * quando quella si sara assestata.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ANNI_CORSO,
  CONSENSO_MARKETING_LICEI_TESTO,
  CONSENSO_PRIVACY_LICEI_TESTO,
  CONTATTI_LICEI,
  DICHIARAZIONE_ACCETTAZIONE_LICEI_TESTO,
  DICHIARAZIONE_POTERI_TESTO,
  IMPEGNI_ISTITUTO,
  LICEI,
  NOTA_DATI_STUDENTI,
} from "./content";
import { validateAdesione, type AdesioneInput } from "@/lib/eventi/licei";

const boxStyle: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  padding: 10,
  fontSize: 14,
  background: "#fff",
  color: "var(--text-dark)",
  width: "100%",
};

function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor: string;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} style={{ fontWeight: 600, color: "var(--text-dark)" }}>
        {children}
      </Label>
      {hint && (
        <p style={{ fontSize: 12, color: "var(--text-light)", margin: "3px 0 0", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function AreaTesto({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      rows={rows}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
    />
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

const PASSI = [
  { n: 1, titolo: "Istituto", icona: "fa-school" },
  { n: 2, titolo: "Referente", icona: "fa-user-tie" },
  { n: 3, titolo: "Impegni", icona: "fa-signature" },
] as const;

export function AdesioneForm({ anteprimaStaff = false }: { anteprimaStaff?: boolean }) {
  const [passo, setPasso] = useState(1);

  // Passo 1
  const [denominazione, setDenominazione] = useState("");
  const [meccanografico, setMeccanografico] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("TA");
  const [emailIstituto, setEmailIstituto] = useState("");
  const [sito, setSito] = useState("");
  const [dirigente, setDirigente] = useState("");

  // Passo 2
  const [refNome, setRefNome] = useState("");
  const [refCognome, setRefCognome] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refTelefono, setRefTelefono] = useState("");
  const [refMateria, setRefMateria] = useState("");
  const [terza, setTerza] = useState("");
  const [quarta, setQuarta] = useState("");
  const [quinta, setQuinta] = useState("");
  const [classi, setClassi] = useState("");
  const [eventoStudenti, setEventoStudenti] = useState("");
  const [eventoDocenti, setEventoDocenti] = useState("");
  const [note, setNote] = useState("");

  // Passo 3
  const [impegni, setImpegni] = useState<Record<string, boolean>>({});
  const [poteri, setPoteri] = useState(false);
  const [accetta, setAccetta] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ codice: string; aggiornata: boolean } | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  // Precompila i dati se il docente è già loggato.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setRefEmail((v) => v || user.email!);
      const fullName = (user.user_metadata?.full_name as string) ?? "";
      const parts = fullName.split(" ").filter(Boolean);
      if (parts[0]) setRefNome((v) => v || parts[0]);
      if (parts.length > 1) setRefCognome((v) => v || parts.slice(1).join(" "));
    })();
  }, []);

  const numero = (v: string) => (v === "" ? undefined : Number(v));

  const payload = useMemo<Partial<AdesioneInput>>(
    () => ({
      istituto_denominazione: denominazione,
      codice_meccanografico: meccanografico,
      istituto_comune: comune,
      istituto_provincia: provincia,
      istituto_email: emailIstituto,
      istituto_sito: sito,
      dirigente_nome: dirigente,
      referente_nome: refNome,
      referente_cognome: refCognome,
      referente_email: refEmail,
      referente_telefono: refTelefono,
      referente_materia: refMateria,
      studenti_terza: numero(terza),
      studenti_quarta: numero(quarta),
      studenti_quinta: numero(quinta),
      classi_coinvolte: classi,
      evento_studenti_stimati: numero(eventoStudenti),
      evento_docenti_stimati: numero(eventoDocenti),
      note,
      impegno_referente: !!impegni.impegno_referente,
      impegno_promozione: !!impegni.impegno_promozione,
      impegno_evento: !!impegni.impegno_evento,
      impegno_consensi: !!impegni.impegno_consensi,
      dichiarazione_poteri: poteri,
      accetta_bando: accetta,
      consenso_privacy: privacy,
      consenso_marketing: marketing,
      website,
    }),
    [
      denominazione, meccanografico, comune, provincia, emailIstituto, sito, dirigente,
      refNome, refCognome, refEmail, refTelefono, refMateria,
      terza, quarta, quinta, classi, eventoStudenti, eventoDocenti, note,
      impegni, poteri, accetta, privacy, marketing, website,
    ],
  );

  const totale =
    (Number(terza) || 0) + (Number(quarta) || 0) + (Number(quinta) || 0);

  const mancanteNelPasso = (p: number): string | null => {
    if (p === 1) {
      if (!denominazione.trim()) return "Indica la denominazione dell'istituto.";
      if (!meccanografico.trim()) return "Indica il codice meccanografico dell'istituto.";
      if (!comune.trim()) return "Indica il comune dell'istituto.";
      if (!emailIstituto.trim()) return "Indica l'email dell'istituto.";
      return null;
    }
    if (p === 2) {
      if (!refNome.trim() || !refCognome.trim())
        return "Indica nome e cognome del docente referente.";
      if (!refEmail.trim()) return "Indica l'email del docente referente.";
      if (!refTelefono.trim()) return "Indica un recapito telefonico del referente.";
      if (totale <= 0)
        return "Indica quanti studenti prevedete di coinvolgere, almeno per un anno di corso.";
      return null;
    }
    return null;
  };

  const vaiA = (p: number) => {
    setError(null);
    setPasso(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const avanti = () => {
    const mancante = mancanteNelPasso(passo);
    if (mancante) {
      setError(mancante);
      return;
    }
    vaiA(Math.min(passo + 1, PASSI.length));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errore = validateAdesione(payload);
    if (errore) {
      setError(errore);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/eventi/licei/adesioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invio non riuscito.");
      setSuccess({ codice: data.codice, aggiornata: !!data.aggiornata });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
        <div className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, marginBottom: 16 }}>
          <i className="fas fa-check text-2xl" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-800">
          {success.aggiornata ? "Adesione aggiornata" : "Adesione ricevuta"}
        </h3>
        <p className="text-gray-600 mb-6">
          Le abbiamo inviato un&apos;email di conferma con il codice dell&apos;istituto e i prossimi
          passi. Verifichiamo l&apos;adesione e le confermiamo l&apos;attivazione nei prossimi giorni.
        </p>
        <div
          style={{
            background: "var(--primary-light)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)", marginBottom: 6 }}>
            Codice del vostro istituto
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
              color: "var(--text-dark)",
            }}
          >
            {success.codice}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 10, lineHeight: 1.6 }}>
            Servirà agli studenti per iscriversi. Non deve distribuirlo adesso: le riscriveremo
            quando apriremo le iscrizioni.
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Per qualsiasi domanda scriva a{" "}
          <a href={`mailto:${CONTATTI_LICEI.fondazione.email}`} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            {CONTATTI_LICEI.fondazione.email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div ref={topRef} style={{ scrollMarginTop: 150 }} />

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
          <strong>Anteprima staff.</strong> La raccolta delle adesioni risulta chiusa. Gli invii che
          fai da qui finiscono davvero nel database.
        </div>
      )}

      {/* Honeypot: invisibile agli umani, riempito dai bot. */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="licei-website">Sito web</label>
        <input
          id="licei-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Indicatore dei passi */}
      <div style={{ display: "flex", gap: 6 }}>
        {PASSI.map((p) => {
          const attivo = p.n === passo;
          const fatto = p.n < passo;
          return (
            <button
              key={p.n}
              type="button"
              onClick={() => p.n < passo && vaiA(p.n)}
              disabled={p.n > passo}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "8px 4px",
                borderRadius: 8,
                border: "none",
                background: attivo ? "var(--primary-light)" : "transparent",
                cursor: p.n < passo ? "pointer" : "default",
                opacity: p.n > passo ? 0.45 : 1,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  background: attivo || fatto ? "var(--primary)" : "#fff",
                  color: attivo || fatto ? "#fff" : "var(--text-light)",
                  border: attivo || fatto ? "none" : "1.5px solid var(--border-color)",
                }}
              >
                {fatto ? <i className="fas fa-check" style={{ fontSize: 10 }} /> : p.n}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: attivo ? 700 : 500,
                  color: attivo ? "var(--primary-dark)" : "var(--text-light)",
                }}
              >
                {p.titolo}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Passo 1. Istituto ── */}
      {passo === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              L&apos;istituto
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              L&apos;adesione è dell&apos;istituto. Un istituto, un&apos;adesione: se un collega ha
              già aderito per la sua scuola, il sistema glielo dirà.
            </p>
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="denominazione">Denominazione dell&apos;istituto *</FieldLabel>
            <Input
              id="denominazione"
              value={denominazione}
              maxLength={200}
              onChange={(e) => setDenominazione(e.target.value)}
              placeholder="Es. Liceo Scientifico Statale Battaglini"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="meccanografico" hint="Dieci caratteri, per esempio TAPS01000B.">
                Codice meccanografico *
              </FieldLabel>
              <Input
                id="meccanografico"
                value={meccanografico}
                onChange={(e) => setMeccanografico(e.target.value.toUpperCase())}
                style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="comune">Comune *</FieldLabel>
              <Input id="comune" value={comune} onChange={(e) => setComune(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="provincia">Provincia</FieldLabel>
              <Input
                id="provincia"
                value={provincia}
                maxLength={2}
                onChange={(e) => setProvincia(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="email_istituto" hint="L'indirizzo istituzionale della scuola.">
                Email dell&apos;istituto *
              </FieldLabel>
              <Input
                id="email_istituto"
                type="email"
                value={emailIstituto}
                onChange={(e) => setEmailIstituto(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="sito">Sito web</FieldLabel>
              <Input id="sito" value={sito} onChange={(e) => setSito(e.target.value)} placeholder="https://" />
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="dirigente" hint="Facoltativo, ma utile per le comunicazioni ufficiali.">
              Dirigente scolastico
            </FieldLabel>
            <Input id="dirigente" value={dirigente} onChange={(e) => setDirigente(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Passo 2. Referente e numeri ── */}
      {passo === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Il docente referente
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Cura il coordinamento con gli organizzatori e riceve tutte le comunicazioni, a partire
              dal codice dell&apos;istituto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="ref_nome">Nome *</FieldLabel>
              <Input id="ref_nome" value={refNome} onChange={(e) => setRefNome(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="ref_cognome">Cognome *</FieldLabel>
              <Input id="ref_cognome" value={refCognome} onChange={(e) => setRefCognome(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="ref_email">Email *</FieldLabel>
              <Input id="ref_email" type="email" value={refEmail} onChange={(e) => setRefEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="ref_telefono">Telefono *</FieldLabel>
              <Input id="ref_telefono" type="tel" value={refTelefono} onChange={(e) => setRefTelefono(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="ref_materia">Materia</FieldLabel>
              <Input id="ref_materia" value={refMateria} onChange={(e) => setRefMateria(e.target.value)} />
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Quanti studenti prevedete
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Una stima basta. Serve a dimensionare il percorso e i posti all&apos;evento del 10
              dicembre. Le classi quarte e quinte hanno la priorità, le terze concorrono ai posti
              residui.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {ANNI_CORSO.map((a) => {
              const value = a.anno === 3 ? terza : a.anno === 4 ? quarta : quinta;
              const setter = a.anno === 3 ? setTerza : a.anno === 4 ? setQuarta : setQuinta;
              return (
                <div className="grid gap-2" key={a.anno}>
                  <FieldLabel htmlFor={`anno_${a.anno}`} hint={a.priorita ? "Prioritaria" : "Posti residui"}>
                    {a.label}
                  </FieldLabel>
                  <Input
                    id={`anno_${a.anno}`}
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          {totale > 0 && (
            <p style={{ fontSize: 13, color: "var(--primary-dark)", fontWeight: 600, margin: 0 }}>
              {totale} studenti previsti in totale.
            </p>
          )}

          <div className="grid gap-2">
            <FieldLabel htmlFor="classi" hint="Facoltativo. Es. 4A, 4C, 5B del liceo scientifico.">
              Classi coinvolte
            </FieldLabel>
            <Input id="classi" value={classi} onChange={(e) => setClassi(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="evento_studenti" hint="Stima di quanti porterete al PalaMazzola.">
                Studenti attesi all&apos;evento
              </FieldLabel>
              <Input
                id="evento_studenti"
                type="number"
                min={0}
                value={eventoStudenti}
                onChange={(e) => setEventoStudenti(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="evento_docenti">Docenti accompagnatori attesi</FieldLabel>
              <Input
                id="evento_docenti"
                type="number"
                min={0}
                value={eventoDocenti}
                onChange={(e) => setEventoDocenti(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="note" hint="Vincoli di orario, esigenze particolari, domande.">
              Note per gli organizzatori
            </FieldLabel>
            <AreaTesto id="note" value={note} onChange={setNote} rows={3} />
          </div>
        </div>
      )}

      {/* ── Passo 3. Impegni e dichiarazioni ── */}
      {passo === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Gli impegni dell&apos;istituto
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Sono quelli previsti dall&apos;art. 4 del bando. Li trova qui per intero, uno per uno.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-light)",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {IMPEGNI_ISTITUTO.map((i) => (
              <Consenso
                key={i.campo}
                checked={!!impegni[i.campo]}
                onChange={(v) => setImpegni((prev) => ({ ...prev, [i.campo]: v }))}
              >
                <strong style={{ color: "var(--text-dark)" }}>{i.titolo}.</strong> {i.testo} *
              </Consenso>
            ))}
          </div>

          <div
            style={{
              background: "#F4F8FF",
              border: "1px solid #D6E4FA",
              borderRadius: 12,
              padding: 16,
              fontSize: 13,
              color: "#28456F",
              lineHeight: 1.7,
            }}
          >
            <strong>Sui dati degli studenti.</strong> {NOTA_DATI_STUDENTI}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Consenso checked={poteri} onChange={setPoteri}>
              {DICHIARAZIONE_POTERI_TESTO} *
            </Consenso>
            <Consenso checked={accetta} onChange={setAccetta}>
              {DICHIARAZIONE_ACCETTAZIONE_LICEI_TESTO} *
            </Consenso>
            <Consenso checked={privacy} onChange={setPrivacy}>
              {CONSENSO_PRIVACY_LICEI_TESTO} *{" "}
              <Link href="/legal/privacy" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Leggi l&apos;informativa
              </Link>
            </Consenso>
            <Consenso checked={marketing} onChange={setMarketing}>
              {CONSENSO_MARKETING_LICEI_TESTO}
            </Consenso>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: "#E74C6F", fontSize: 14, margin: 0, lineHeight: 1.6 }} role="alert">
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {passo > 1 && (
          <Button type="button" variant="outline" onClick={() => vaiA(passo - 1)}>
            Indietro
          </Button>
        )}
        {passo < PASSI.length ? (
          <Button type="button" className="flex-1" onClick={avanti}>
            Avanti
          </Button>
        ) : (
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Invio in corso…" : "Invia l'adesione"}
          </Button>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-light)", margin: 0, textAlign: "center", lineHeight: 1.6 }}>
        Aderendo creiamo un account per il docente referente, da cui potrà seguire le iscrizioni dei
        suoi studenti. Il percorso si chiude il {LICEI.dataLabel.toLowerCase()} al {LICEI.luogo}.
      </p>
    </form>
  );
}
