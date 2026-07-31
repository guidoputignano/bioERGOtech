"use client";

/**
 * Modulo di candidatura al bando "Showcase di Innovazione".
 *
 * Sei passi, uno per blocco del bando: categoria, progetto, proponente,
 * dettaglio del progetto, allegati, dichiarazioni. La validazione che conta
 * e quella di `lib/eventi/bando.ts`, condivisa con l'API: qui la usiamo per
 * dare feedback immediato, non come difesa.
 *
 * Gli allegati non passano dalle nostre funzioni serverless: la rotta di
 * upload rilascia un URL firmato e il browser carica direttamente su Supabase
 * Storage, cosi un PDF da 10 MB non incontra il limite di corpo delle
 * richieste.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AMBITI,
  BANDO_BUCKET,
  CANDIDATURE_SCADENZA_LABEL,
  CATEGORIE_BANDO,
  CONSENSO_MARKETING_BANDO_TESTO,
  CONSENSO_PRIVACY_BANDO_TESTO,
  CONTATTI,
  DICHIARAZIONE_ACCETTAZIONE_TESTO,
  DICHIARAZIONE_CONCORSUALI_TESTO,
  DICHIARAZIONE_PUBBLICITA_TESTO,
  DICHIARAZIONE_VERIDICITA_TESTO,
  MAX_FILE_EXTRA,
  MAX_FILE_LABEL,
  OBIETTIVI_CATEGORIA_C,
  SOGLIA_RACCOLTA_EUR,
  STADI_CATEGORIA_A,
  STRUMENTI_RACCOLTA,
  VIDEO_DURATA_MAX,
  allegatiPerCategoria,
  allegatoObbligatorio,
  type CampoAllegato,
  type CategoriaBandoId,
} from "./content";
import {
  CAMPI_DESCRIZIONE,
  MIN_TESTO_LUNGO,
  validateBando,
  type AllegatoCaricato,
  type BandoInput,
} from "@/lib/eventi/bando";

/* ── Stile condiviso ──────────────────────────────────────────────────── */

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
  rows = 4,
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
    <>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...boxStyle, resize: "vertical", lineHeight: 1.6 }}
      />
      {maxLength && (
        <span style={{ fontSize: 11, color: "var(--text-light)", textAlign: "right" }}>
          {value.length} / {maxLength}
        </span>
      )}
    </>
  );
}

/** Casella selezionabile con titolo e descrizione, usata per liste e opzioni. */
function Scelta({
  selected,
  onToggle,
  titolo,
  desc,
  radio,
}: {
  selected: boolean;
  onToggle: () => void;
  titolo: React.ReactNode;
  desc?: React.ReactNode;
  radio?: boolean;
}) {
  return (
    <div
      role={radio ? "radio" : "checkbox"}
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        padding: 14,
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
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          borderRadius: radio ? "50%" : 5,
          border: `2px solid ${selected ? "var(--primary)" : "#CBD5E0"}`,
          background: selected ? "var(--primary)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {selected &&
          (radio ? (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
          ) : (
            <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: 14 }}>{titolo}</div>
        {desc && (
          <div style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 3, lineHeight: 1.55 }}>
            {desc}
          </div>
        )}
      </div>
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
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        cursor: "pointer",
        fontSize: 13,
        color: "var(--text-mid)",
        lineHeight: 1.6,
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

const formatBytes = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/* ── Passi ────────────────────────────────────────────────────────────── */

const PASSI = [
  { n: 1, titolo: "Categoria", icona: "fa-layer-group" },
  { n: 2, titolo: "Progetto", icona: "fa-lightbulb" },
  { n: 3, titolo: "Proponente", icona: "fa-users" },
  { n: 4, titolo: "Dettaglio", icona: "fa-file-lines" },
  { n: 5, titolo: "Allegati", icona: "fa-paperclip" },
  { n: 6, titolo: "Dichiarazioni", icona: "fa-signature" },
] as const;

type Allegati = Partial<Record<Exclude<CampoAllegato, "extra">, AllegatoCaricato>> & {
  extra: AllegatoCaricato[];
};

export function BandoForm({ anteprimaStaff = false }: { anteprimaStaff?: boolean }) {
  const [passo, setPasso] = useState(1);
  const [draft, setDraft] = useState("");

  // Passo 1
  const [categoria, setCategoria] = useState<CategoriaBandoId | "">("");

  // Passo 2
  const [progettoNome, setProgettoNome] = useState("");
  const [progettoSintesi, setProgettoSintesi] = useState("");
  const [ambiti, setAmbiti] = useState<string[]>([]);

  // Passo 3
  const [organizzazione, setOrganizzazione] = useState("");
  const [formaGiuridica, setFormaGiuridica] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [dataCostituzione, setDataCostituzione] = useState("");
  const [paese, setPaese] = useState("Italia");
  const [citta, setCitta] = useState("");
  const [sitoWeb, setSitoWeb] = useState("");
  const [refNome, setRefNome] = useState("");
  const [refCognome, setRefCognome] = useState("");
  const [refRuolo, setRefRuolo] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [refTelefono, setRefTelefono] = useState("");
  const [refMaggiorenne, setRefMaggiorenne] = useState(false);
  const [teamDimensione, setTeamDimensione] = useState("");
  const [teamDescrizione, setTeamDescrizione] = useState("");

  // Passo 4
  const [problema, setProblema] = useState("");
  const [soluzione, setSoluzione] = useState("");
  const [statoAvanzamento, setStatoAvanzamento] = useState("");
  const [impattoAtteso, setImpattoAtteso] = useState("");
  const [aspettiEtici, setAspettiEtici] = useState("");
  const [aStadio, setAStadio] = useState("");
  const [aEnteRicerca, setAEnteRicerca] = useState("");
  const [bStatoPrototipo, setBStatoPrototipo] = useState("");
  const [bValidazione, setBValidazione] = useState("");
  const [bRaccolta, setBRaccolta] = useState("");
  const [bModelloBusiness, setBModelloBusiness] = useState("");
  const [cRaccolta, setCRaccolta] = useState("");
  const [cRicavi, setCRicavi] = useState("");
  const [cStrumenti, setCStrumenti] = useState<string[]>([]);
  const [cRound, setCRound] = useState("");
  const [cObiettivi, setCObiettivi] = useState<string[]>([]);
  const [cTrazione, setCTrazione] = useState("");

  // Passo 5
  const [allegati, setAllegati] = useState<Allegati>({ extra: [] });
  const [videoUrl, setVideoUrl] = useState("");
  const [pubblicazioni, setPubblicazioni] = useState("");
  const [brevetti, setBrevetti] = useState("");
  const [inCaricamento, setInCaricamento] = useState<CampoAllegato | null>(null);
  const [erroreFile, setErroreFile] = useState<string | null>(null);

  // Passo 6
  const [presenzaTaranto, setPresenzaTaranto] = useState(false);
  const [edizioniPrecedenti, setEdizioniPrecedenti] = useState(false);
  const [edizioniAvanzamenti, setEdizioniAvanzamenti] = useState("");
  const [noConcorsuali, setNoConcorsuali] = useState(false);
  const [dichVeridicita, setDichVeridicita] = useState(false);
  const [accettaBando, setAccettaBando] = useState(false);
  const [presaAttoPubblicita, setPresaAttoPubblicita] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [consensoMarketing, setConsensoMarketing] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ codice: string; aggiornata: boolean } | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  /* ── Bozza e precompilazione ── */

  // La bozza sopravvive a un ricaricamento della pagina, cosi gli allegati
  // gia caricati non diventano orfani.
  useEffect(() => {
    const chiave = "bando-draft-id";
    let id = "";
    try {
      id = sessionStorage.getItem(chiave) ?? "";
    } catch {
      /* sessionStorage non disponibile: si procede con una bozza volatile */
    }
    if (!id) {
      id = crypto.randomUUID();
      try {
        sessionStorage.setItem(chiave, id);
      } catch {
        /* ignoriamo: la bozza vive comunque per la durata della pagina */
      }
    }
    setDraft(id);
  }, []);

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

  const isSocieta = categoria === "B" || categoria === "C";

  /* ── Payload ── */

  const payload = useMemo<Partial<BandoInput>>(
    () => ({
      draft_id: draft,
      categoria: (categoria || undefined) as CategoriaBandoId,
      progetto_nome: progettoNome,
      progetto_sintesi: progettoSintesi,
      ambiti,
      organizzazione,
      forma_giuridica: formaGiuridica,
      partita_iva: partitaIva,
      data_costituzione: dataCostituzione,
      paese,
      citta,
      sito_web: sitoWeb,
      referente_nome: refNome,
      referente_cognome: refCognome,
      referente_ruolo: refRuolo,
      referente_email: refEmail,
      referente_telefono: refTelefono,
      referente_maggiorenne: refMaggiorenne,
      team_dimensione: teamDimensione ? Number(teamDimensione) : undefined,
      team_descrizione: teamDescrizione,
      problema,
      soluzione,
      stato_avanzamento: statoAvanzamento,
      impatto_atteso: impattoAtteso,
      aspetti_etici: aspettiEtici,
      a_stadio: aStadio,
      a_ente_ricerca: aEnteRicerca,
      b_stato_prototipo: bStatoPrototipo,
      b_validazione: bValidazione,
      b_raccolta_totale_eur: bRaccolta === "" ? undefined : Number(bRaccolta),
      b_modello_business: bModelloBusiness,
      c_raccolta_totale_eur: cRaccolta === "" ? undefined : Number(cRaccolta),
      c_ricavi_ultimo_anno_eur: cRicavi === "" ? undefined : Number(cRicavi),
      c_strumenti: cStrumenti,
      c_round: cRound,
      c_obiettivi: cObiettivi,
      c_trazione: cTrazione,
      file_descrizione: allegati.descrizione ?? null,
      file_pitch_deck: allegati.pitch_deck ?? null,
      file_documentazione: allegati.documentazione ?? null,
      file_prospetto: allegati.prospetto ?? null,
      file_extra: allegati.extra,
      video_url: videoUrl,
      pubblicazioni,
      brevetti,
      presenza_taranto: presenzaTaranto,
      edizioni_precedenti: edizioniPrecedenti,
      edizioni_avanzamenti: edizioniAvanzamenti,
      no_procedure_concorsuali: isSocieta ? noConcorsuali : true,
      dichiarazione_veridicita: dichVeridicita,
      accetta_bando: accettaBando,
      presa_atto_pubblicita: presaAttoPubblicita,
      consenso_privacy: consensoPrivacy,
      consenso_marketing: consensoMarketing,
      website,
    }),
    [
      draft, categoria, progettoNome, progettoSintesi, ambiti, organizzazione, formaGiuridica,
      partitaIva, dataCostituzione, paese, citta, sitoWeb, refNome, refCognome, refRuolo,
      refEmail, refTelefono, refMaggiorenne, teamDimensione, teamDescrizione, problema,
      soluzione, statoAvanzamento, impattoAtteso, aspettiEtici, aStadio, aEnteRicerca,
      bStatoPrototipo, bValidazione, bRaccolta, bModelloBusiness, cRaccolta, cRicavi,
      cStrumenti, cRound, cObiettivi, cTrazione, allegati, videoUrl, pubblicazioni, brevetti,
      presenzaTaranto, edizioniPrecedenti, edizioniAvanzamenti, noConcorsuali, isSocieta,
      dichVeridicita, accettaBando, presaAttoPubblicita, consensoPrivacy, consensoMarketing,
      website,
    ],
  );

  /* ── Avanzamento fra i passi ── */

  /**
   * Che cosa manca per passare al passo successivo. Ritorna null se il passo
   * e completo. Il testo e lo stesso che comparirebbe all'invio: cosi
   * l'utente non scopre alla fine che manca qualcosa a meta strada.
   */
  const mancanteNelPasso = (p: number): string | null => {
    if (p === 1) return categoria ? null : "Scegli la categoria di partecipazione.";
    if (p === 2) {
      if (!progettoNome.trim()) return "Indica il nome del progetto.";
      if (!progettoSintesi.trim()) return "Scrivi una sintesi del progetto in una riga.";
      if (ambiti.length === 0) return "Seleziona almeno un ambito tematico.";
      return null;
    }
    if (p === 3) {
      if (isSocieta && !organizzazione.trim()) return "Indica la denominazione della società.";
      if (isSocieta && !partitaIva.trim()) return "Indica la partita IVA o il codice fiscale.";
      if (isSocieta && !dataCostituzione) return "Indica la data di costituzione della società.";
      if (!paese.trim()) return "Indica il paese del proponente.";
      if (!citta.trim()) return "Indica la città del proponente.";
      if (!refNome.trim() || !refCognome.trim()) return "Indica nome e cognome del referente.";
      if (!refEmail.trim()) return "Indica l'email del referente.";
      if (!refTelefono.trim()) return "Indica un recapito telefonico del referente.";
      if (!refMaggiorenne) return "Il bando richiede un referente di progetto maggiorenne.";
      if (!teamDescrizione.trim()) return "Descrivi il team e le sue competenze.";
      return null;
    }
    if (p === 4) {
      for (const [campo, etichetta] of CAMPI_DESCRIZIONE) {
        const v = String(payload[campo] ?? "").trim();
        if (!v) return `Descrivi ${etichetta}.`;
        if (v.length < MIN_TESTO_LUNGO)
          return `La risposta su ${etichetta} è troppo breve: servono almeno ${MIN_TESTO_LUNGO} caratteri.`;
      }
      if (categoria === "A" && !aStadio)
        return "Indica lo stadio del progetto: concetto, studio di fattibilità o proof of concept.";
      if (categoria === "B") {
        if (!bStatoPrototipo.trim()) return "Descrivi lo stato del prototipo o dell'MVP.";
        if (!bModelloBusiness.trim()) return "Descrivi il modello di business.";
        if (bRaccolta === "") return "Indica la raccolta di capitale complessiva, anche se pari a zero.";
        if (Number(bRaccolta) > SOGLIA_RACCOLTA_EUR)
          return `Una raccolta superiore a ${SOGLIA_RACCOLTA_EUR.toLocaleString("it-IT")} euro rientra nella categoria C. Torna al primo passo per cambiare categoria.`;
      }
      if (categoria === "C") {
        if ((Number(cRaccolta) || 0) < SOGLIA_RACCOLTA_EUR && (Number(cRicavi) || 0) <= 0)
          return `La categoria C richiede una raccolta pari o superiore a ${SOGLIA_RACCOLTA_EUR.toLocaleString("it-IT")} euro oppure ricavi consolidati. Se non ricorre nessuna delle due condizioni, candidati in categoria B.`;
        if ((Number(cRaccolta) || 0) > 0 && cStrumenti.length === 0)
          return "Indica la tipologia degli strumenti con cui hai raccolto.";
        if (!cRound.trim()) return "Sintetizza i round chiusi, gli importi e la destinazione dei proventi.";
        if (!cTrazione.trim()) return "Descrivi la trazione già dimostrata.";
        if (cObiettivi.length === 0)
          return "Indica che cosa cerchi: partnership, validazione clinica o un nuovo round.";
      }
      return null;
    }
    if (p === 5) {
      for (const a of allegatiPerCategoria(categoria as CategoriaBandoId)) {
        if (a.campo === "extra") continue;
        if (
          allegatoObbligatorio(a, categoria as CategoriaBandoId) &&
          !allegati[a.campo as Exclude<CampoAllegato, "extra">]
        ) {
          return `Carica "${a.titolo}" in formato PDF.`;
        }
      }
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

  /* ── Allegati ── */

  const caricaFile = useCallback(
    async (campo: CampoAllegato, file: File) => {
      setErroreFile(null);
      setInCaricamento(campo);
      try {
        const res = await fetch("/api/eventi/bando/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft, campo, nome: file.name, size: file.size }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Caricamento non riuscito.");

        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from(BANDO_BUCKET)
          .uploadToSignedUrl(data.path, data.token, file, { contentType: "application/pdf" });
        if (upErr) throw new Error("Caricamento non riuscito. Controlla il file e riprova.");

        const caricato: AllegatoCaricato = { path: data.path, nome: file.name, size: file.size };
        setAllegati((prev) =>
          campo === "extra"
            ? { ...prev, extra: [...prev.extra, caricato] }
            : { ...prev, [campo]: caricato },
        );
      } catch (err) {
        setErroreFile(err instanceof Error ? err.message : "Caricamento non riuscito.");
      } finally {
        setInCaricamento(null);
      }
    },
    [draft],
  );

  const rimuoviFile = useCallback(
    async (campo: CampoAllegato, path: string) => {
      setAllegati((prev) =>
        campo === "extra"
          ? { ...prev, extra: prev.extra.filter((f) => f.path !== path) }
          : { ...prev, [campo]: undefined },
      );
      try {
        await fetch("/api/eventi/bando/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft, path }),
        });
      } catch {
        /* il file resta nello storage ma fuori dalla candidatura: innocuo */
      }
    },
    [draft],
  );

  /**
   * Cambiare categoria scarta gli allegati che la nuova categoria non
   * prevede. Senza questo, chi passa da C ad A si porterebbe dietro il
   * prospetto della raccolta fin dentro il database.
   */
  const cambiaCategoria = (nuova: CategoriaBandoId) => {
    if (nuova === categoria) return;
    const ammessi = new Set(allegatiPerCategoria(nuova).map((a) => a.campo));
    for (const campo of ["descrizione", "pitch_deck", "documentazione", "prospetto"] as const) {
      const file = allegati[campo];
      if (file && !ammessi.has(campo)) rimuoviFile(campo, file.path);
    }
    setCategoria(nuova);
  };

  /* ── Invio ── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errore = validateBando(payload);
    if (errore) {
      setError(errore);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/eventi/bando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invio non riuscito.");
      setSuccess({ codice: data.codice, aggiornata: !!data.aggiornata });
      try {
        sessionStorage.removeItem("bando-draft-id");
      } catch {
        /* niente da fare */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invio non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Esito ── */

  if (success) {
    return (
      <div className="card" style={{ borderTop: "4px solid var(--primary)" }}>
        <div className="icon-circle icon-circle-primary" style={{ width: 56, height: 56, marginBottom: 16 }}>
          <i className="fas fa-check text-2xl" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-gray-800">
          {success.aggiornata ? "Candidatura aggiornata" : "Candidatura ricevuta"}
        </h3>
        <p className="text-gray-600 mb-6">
          Ti abbiamo inviato un&apos;email di conferma con il riepilogo e il calendario della
          procedura. Puoi modificare la candidatura fino al {CANDIDATURE_SCADENZA_LABEL}, accedendo
          al Member Portal e reinviando il form con lo stesso nome del progetto.
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
            Codice della candidatura
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
        </div>
        <p className="text-sm text-gray-600">
          Per qualsiasi domanda scrivi a{" "}
          <a href={`mailto:${CONTATTI.fondazione.email}`} style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            {CONTATTI.fondazione.email}
          </a>
          .
        </p>
      </div>
    );
  }

  /* ── Form ── */

  const catCorrente = CATEGORIE_BANDO.find((c) => c.id === categoria);

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div ref={topRef} style={{ scrollMarginTop: 100 }} />

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
          <strong>Anteprima staff.</strong> Le candidature non sono ancora aperte al pubblico. Gli
          invii che fai da qui finiscono davvero nel database.
        </div>
      )}

      {/* Honeypot: invisibile agli umani, riempito dai bot. */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        <label htmlFor="bando-website">Sito web</label>
        <input
          id="bando-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {/* Indicatore dei passi */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                flex: "1 1 90px",
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
                  fontSize: 10.5,
                  fontWeight: attivo ? 700 : 500,
                  color: attivo ? "var(--primary-dark)" : "var(--text-light)",
                  textAlign: "center",
                }}
              >
                {p.titolo}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Passo 1. Categoria ── */}
      {passo === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              In quale categoria ti candidi?
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Puoi scegliere una sola categoria. Criteri di valutazione e premi sono distinti. Se
              la Commissione ritiene che ricorrano i presupposti per una categoria diversa, può
              riassegnare la candidatura e te lo comunica prima della valutazione.
            </p>
          </div>
          {CATEGORIE_BANDO.map((c) => (
            <Scelta
              key={c.id}
              radio
              selected={categoria === c.id}
              onToggle={() => cambiaCategoria(c.id)}
              titolo={`${c.id}. ${c.stadio}`}
              desc={
                <>
                  {c.chiPuoCandidarsi}
                  <br />
                  <span style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                    Pitch di {c.durataPitch} più {c.domande} di domande . {c.progettiAmmessi} progetti ammessi
                  </span>
                </>
              }
            />
          ))}
        </div>
      )}

      {/* ── Passo 2. Progetto ── */}
      {passo === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
            Il progetto
          </h3>

          <div className="grid gap-2">
            <FieldLabel htmlFor="progetto_nome">Nome del progetto *</FieldLabel>
            <Input
              id="progetto_nome"
              value={progettoNome}
              maxLength={160}
              onChange={(e) => setProgettoNome(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor="progetto_sintesi" hint="Una riga, come la leggerebbe chi non conosce il tuo settore.">
              Sintesi in una riga *
            </FieldLabel>
            <AreaTesto
              id="progetto_sintesi"
              value={progettoSintesi}
              onChange={setProgettoSintesi}
              rows={2}
              maxLength={300}
              placeholder="Es. Un dispositivo indossabile che misura il carico articolare durante la riabilitazione del ginocchio."
            />
          </div>

          <div className="grid gap-3">
            <FieldLabel htmlFor="ambiti" hint="Seleziona uno o più ambiti fra quelli previsti dal bando.">
              Ambiti tematici *
            </FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="ambiti">
              {AMBITI.map((a) => (
                <Scelta
                  key={a.value}
                  selected={ambiti.includes(a.value)}
                  onToggle={() =>
                    setAmbiti((prev) =>
                      prev.includes(a.value) ? prev.filter((v) => v !== a.value) : [...prev, a.value],
                    )
                  }
                  titolo={
                    <>
                      <i className={`fas ${a.icona}`} style={{ color: "var(--primary)", marginRight: 7 }} />
                      {a.label}
                    </>
                  }
                  desc={a.desc}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Passo 3. Proponente e referente ── */}
      {passo === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
            Il proponente
          </h3>

          {isSocieta ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="organizzazione">Denominazione sociale *</FieldLabel>
                  <Input id="organizzazione" value={organizzazione} onChange={(e) => setOrganizzazione(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="forma_giuridica">Forma giuridica</FieldLabel>
                  <Input
                    id="forma_giuridica"
                    value={formaGiuridica}
                    onChange={(e) => setFormaGiuridica(e.target.value)}
                    placeholder="Es. Srl innovativa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="partita_iva">Partita IVA o codice fiscale *</FieldLabel>
                  <Input id="partita_iva" value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel
                    htmlFor="data_costituzione"
                    hint={
                      categoria === "B"
                        ? "La categoria B richiede una società costituita da non più di 36 mesi alla scadenza del bando."
                        : undefined
                    }
                  >
                    Data di costituzione *
                  </FieldLabel>
                  <Input
                    id="data_costituzione"
                    type="date"
                    value={dataCostituzione}
                    onChange={(e) => setDataCostituzione(e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              <FieldLabel
                htmlFor="organizzazione"
                hint="Facoltativo in categoria A: università, ente di ricerca o gruppo informale di riferimento."
              >
                Gruppo o ente di riferimento
              </FieldLabel>
              <Input id="organizzazione" value={organizzazione} onChange={(e) => setOrganizzazione(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="paese">Paese *</FieldLabel>
              <Input id="paese" value={paese} onChange={(e) => setPaese(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="citta">Città *</FieldLabel>
              <Input id="citta" value={citta} onChange={(e) => setCitta(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="sito_web">Sito web</FieldLabel>
              <Input id="sito_web" value={sitoWeb} onChange={(e) => setSitoWeb(e.target.value)} placeholder="https://" />
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Il referente di progetto
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4 }}>
              Cura i rapporti con gli organizzatori e riceve tutte le comunicazioni sul bando.
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
              <FieldLabel htmlFor="ref_ruolo">Ruolo nel progetto</FieldLabel>
              <Input id="ref_ruolo" value={refRuolo} onChange={(e) => setRefRuolo(e.target.value)} placeholder="Es. CEO, PI, referente scientifico" />
            </div>
          </div>

          <Consenso checked={refMaggiorenne} onChange={setRefMaggiorenne}>
            Confermo che il referente di progetto è maggiorenne. *
          </Consenso>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="team_dimensione">Componenti</FieldLabel>
              <Input
                id="team_dimensione"
                type="number"
                min={1}
                value={teamDimensione}
                onChange={(e) => setTeamDimensione(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <FieldLabel htmlFor="team_descrizione" hint="Chi siete e quali competenze portate rispetto agli obiettivi dichiarati.">
                Il team *
              </FieldLabel>
              <AreaTesto id="team_descrizione" value={teamDescrizione} onChange={setTeamDescrizione} rows={3} />
            </div>
          </div>
        </div>
      )}

      {/* ── Passo 4. Dettaglio del progetto ── */}
      {passo === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Il progetto in dettaglio
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Sono le voci che il bando chiede nella descrizione del progetto. Qui bastano poche
              righe per voce: il PDF che allegherai al passo successivo le sviluppa.
            </p>
          </div>

          {(
            [
              ["problema", "Il problema affrontato *", problema, setProblema, "Che cosa non funziona oggi, e per chi."],
              ["soluzione", "La soluzione *", soluzione, setSoluzione, "Come interviene la tua soluzione e perché è diversa da quello che esiste."],
              ["stato_avanzamento", "Stato di avanzamento *", statoAvanzamento, setStatoAvanzamento, "A che punto siete: evidenze raccolte, prototipi, test, utenti."],
              ["impatto_atteso", "Impatto atteso *", impattoAtteso, setImpattoAtteso, "Il beneficio atteso su salute, longevità o sport, e le ricadute potenziali."],
              ["aspetti_etici", "Aspetti etici connessi *", aspettiEtici, setAspettiEtici, "Trattamento dei dati, sperimentazione, accessibilità, rischi e come li gestite."],
            ] as [string, string, string, (v: string) => void, string][]
          ).map(([id, label, value, setter, hint]) => (
            <div className="grid gap-2" key={id}>
              <FieldLabel htmlFor={id} hint={hint}>
                {label}
              </FieldLabel>
              <AreaTesto id={id} value={value} onChange={setter} rows={4} />
            </div>
          ))}

          {/* Campi propri della categoria */}
          {categoria === "A" && (
            <div style={{ background: "var(--bg-light)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid gap-3">
                <FieldLabel htmlFor="a_stadio">Stadio del progetto *</FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" id="a_stadio">
                  {STADI_CATEGORIA_A.map((s) => (
                    <Scelta key={s.value} radio selected={aStadio === s.value} onToggle={() => setAStadio(s.value)} titolo={s.label} />
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="a_ente_ricerca" hint="Se il progetto nasce in un laboratorio o in un gruppo di ricerca, indicalo qui.">
                  Ente o laboratorio di riferimento
                </FieldLabel>
                <Input id="a_ente_ricerca" value={aEnteRicerca} onChange={(e) => setAEnteRicerca(e.target.value)} />
              </div>
            </div>
          )}

          {categoria === "B" && (
            <div style={{ background: "var(--bg-light)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid gap-2">
                <FieldLabel htmlFor="b_stato_prototipo" hint="Prototipo o MVP: che cosa esiste già e che cosa è in sviluppo.">
                  Stato del prototipo o dell&apos;MVP *
                </FieldLabel>
                <AreaTesto id="b_stato_prototipo" value={bStatoPrototipo} onChange={setBStatoPrototipo} rows={3} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="b_validazione" hint="Dati sperimentali raccolti e riscontri dai primi utilizzatori.">
                  Grado di validazione
                </FieldLabel>
                <AreaTesto id="b_validazione" value={bValidazione} onChange={setBValidazione} rows={3} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="b_modello_business" hint="Struttura dei costi e dei ricavi, percorso verso il mercato.">
                  Modello di business *
                </FieldLabel>
                <AreaTesto id="b_modello_business" value={bModelloBusiness} onChange={setBModelloBusiness} rows={3} />
              </div>
              <div className="grid gap-2">
                <FieldLabel
                  htmlFor="b_raccolta"
                  hint={`Equity, venture debt, strumenti convertibili e sovvenzioni competitive già erogate o deliberate. Scrivi 0 se non hai ancora raccolto. Oltre ${SOGLIA_RACCOLTA_EUR.toLocaleString("it-IT")} euro la categoria corretta è la C.`}
                >
                  Raccolta di capitale complessiva, in euro *
                </FieldLabel>
                <Input
                  id="b_raccolta"
                  type="number"
                  min={0}
                  step={1000}
                  value={bRaccolta}
                  onChange={(e) => setBRaccolta(e.target.value)}
                />
              </div>
            </div>
          )}

          {categoria === "C" && (
            <div style={{ background: "var(--bg-light)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="c_raccolta" hint="Totale dei round chiusi.">
                    Raccolta complessiva, in euro
                  </FieldLabel>
                  <Input id="c_raccolta" type="number" min={0} step={1000} value={cRaccolta} onChange={(e) => setCRaccolta(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="c_ricavi" hint="Se la raccolta è sotto soglia, sono i ricavi a qualificare la categoria C.">
                    Ricavi ultimo esercizio, in euro
                  </FieldLabel>
                  <Input id="c_ricavi" type="number" min={0} step={1000} value={cRicavi} onChange={(e) => setCRicavi(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3">
                <FieldLabel htmlFor="c_strumenti">Strumenti utilizzati</FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="c_strumenti">
                  {STRUMENTI_RACCOLTA.map((s) => (
                    <Scelta
                      key={s.value}
                      selected={cStrumenti.includes(s.value)}
                      onToggle={() =>
                        setCStrumenti((prev) =>
                          prev.includes(s.value) ? prev.filter((v) => v !== s.value) : [...prev, s.value],
                        )
                      }
                      titolo={s.label}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="c_round" hint="Round chiusi, importi, tipologia degli strumenti e destinazione dei proventi.">
                  Sintesi della raccolta *
                </FieldLabel>
                <AreaTesto id="c_round" value={cRound} onChange={setCRound} rows={3} />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="c_trazione" hint="Ricavi, clienti, partnership industriali e risultati di validazione clinica già conseguiti.">
                  Trazione dimostrata *
                </FieldLabel>
                <AreaTesto id="c_trazione" value={cTrazione} onChange={setCTrazione} rows={3} />
              </div>
              <div className="grid gap-3">
                <FieldLabel htmlFor="c_obiettivi">Che cosa cerchi *</FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" id="c_obiettivi">
                  {OBIETTIVI_CATEGORIA_C.map((o) => (
                    <Scelta
                      key={o.value}
                      selected={cObiettivi.includes(o.value)}
                      onToggle={() =>
                        setCObiettivi((prev) =>
                          prev.includes(o.value) ? prev.filter((v) => v !== o.value) : [...prev, o.value],
                        )
                      }
                      titolo={o.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Passo 5. Allegati ── */}
      {passo === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Documentazione
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4, lineHeight: 1.6 }}>
              Solo file PDF, fino a {MAX_FILE_LABEL} ciascuno. Il modulo di candidatura previsto dal
              bando è questo form: non serve allegarlo.
            </p>
          </div>

          {allegatiPerCategoria(categoria as CategoriaBandoId).map((a) => {
            const obbligatorio = allegatoObbligatorio(a, categoria as CategoriaBandoId);
            const singolo = a.campo !== "extra";
            const file = singolo ? allegati[a.campo as Exclude<CampoAllegato, "extra">] : undefined;
            const pieno = singolo ? Boolean(file) : allegati.extra.length >= MAX_FILE_EXTRA;
            const caricando = inCaricamento === a.campo;

            return (
              <div
                key={a.campo}
                style={{
                  border: `1px solid ${obbligatorio && !file && singolo ? "var(--border-color)" : "var(--border-color)"}`,
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-dark)" }}>
                      {a.titolo} {obbligatorio ? "*" : ""}
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: "4px 0 0", lineHeight: 1.55 }}>
                      {a.desc}
                    </p>
                  </div>
                  {!obbligatorio && (
                    <span className="badge" style={{ background: "var(--bg-light)", color: "var(--text-light)", flexShrink: 0 }}>
                      Facoltativo
                    </span>
                  )}
                </div>

                {/* File già caricati */}
                {(singolo ? (file ? [file] : []) : allegati.extra).map((f) => (
                  <div
                    key={f.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 12,
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--primary-light)",
                    }}
                  >
                    <i className="fas fa-file-pdf" style={{ color: "var(--primary-dark)" }} aria-hidden="true" />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.nome}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--text-mid)", flexShrink: 0 }}>{formatBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => rimuoviFile(a.campo, f.path)}
                      aria-label={`Rimuovi ${f.nome}`}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-light)", flexShrink: 0 }}
                    >
                      <i className="fas fa-xmark" />
                    </button>
                  </div>
                ))}

                {!pieno && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 12,
                      padding: "12px",
                      borderRadius: 8,
                      border: "1.5px dashed var(--border-color)",
                      cursor: caricando ? "wait" : "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--primary-dark)",
                      background: "var(--bg-light)",
                    }}
                  >
                    <i className={`fas ${caricando ? "fa-spinner fa-spin" : "fa-arrow-up-from-bracket"}`} aria-hidden="true" />
                    {caricando ? "Caricamento in corso…" : "Scegli un file PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={caricando || !draft}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) caricaFile(a.campo, f);
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}

          {erroreFile && <p style={{ color: "#E74C6F", fontSize: 13, margin: 0 }}>{erroreFile}</p>}

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)" }} />

          <div className="grid gap-2">
            <FieldLabel htmlFor="video_url" hint={`Facoltativo. Durata non superiore a ${VIDEO_DURATA_MAX}. Incolla il link a YouTube, Vimeo o a un file condiviso.`}>
              Video dimostrativo
            </FieldLabel>
            <Input id="video_url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="pubblicazioni" hint="Riferimenti o DOI, uno per riga.">
                Pubblicazioni scientifiche
              </FieldLabel>
              <AreaTesto id="pubblicazioni" value={pubblicazioni} onChange={setPubblicazioni} rows={3} />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="brevetti" hint="Numero di deposito o di concessione, e stato.">
                Brevetti depositati o concessi
              </FieldLabel>
              <AreaTesto id="brevetti" value={brevetti} onChange={setBrevetti} rows={3} />
            </div>
          </div>
        </div>
      )}

      {/* ── Passo 6. Dichiarazioni ── */}
      {passo === 6 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 className="font-semibold text-gray-800" style={{ fontSize: 17 }}>
              Ammissibilità e dichiarazioni
            </h3>
            {catCorrente && (
              <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4 }}>
                Stai inviando la candidatura di <strong>{progettoNome || "il tuo progetto"}</strong> in
                categoria {catCorrente.id}, {catCorrente.stadio.toLowerCase()}.
              </p>
            )}
          </div>

          <div style={{ background: "var(--bg-light)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <Consenso checked={presenzaTaranto} onChange={setPresenzaTaranto}>
              Confermo la disponibilità di almeno un componente del team a essere fisicamente
              presente a Taranto l&apos;11 dicembre 2026 per la presentazione dal vivo. *
            </Consenso>

            {isSocieta && (
              <Consenso checked={noConcorsuali} onChange={setNoConcorsuali}>
                {DICHIARAZIONE_CONCORSUALI_TESTO} *
              </Consenso>
            )}

            <Consenso checked={edizioniPrecedenti} onChange={setEdizioniPrecedenti}>
              Il progetto è già stato presentato in edizioni precedenti dello stesso evento.
            </Consenso>

            {edizioniPrecedenti && (
              <div className="grid gap-2">
                <FieldLabel
                  htmlFor="edizioni_avanzamenti"
                  hint="Il bando ammette un progetto già presentato solo in presenza di avanzamenti sostanziali documentabili."
                >
                  Avanzamenti rispetto all&apos;edizione precedente *
                </FieldLabel>
                <AreaTesto id="edizioni_avanzamenti" value={edizioniAvanzamenti} onChange={setEdizioniAvanzamenti} rows={3} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Consenso checked={dichVeridicita} onChange={setDichVeridicita}>
              {DICHIARAZIONE_VERIDICITA_TESTO} *
            </Consenso>
            <Consenso checked={accettaBando} onChange={setAccettaBando}>
              {DICHIARAZIONE_ACCETTAZIONE_TESTO} *
            </Consenso>
            <Consenso checked={presaAttoPubblicita} onChange={setPresaAttoPubblicita}>
              {DICHIARAZIONE_PUBBLICITA_TESTO} *
            </Consenso>
            <Consenso checked={consensoPrivacy} onChange={setConsensoPrivacy}>
              {CONSENSO_PRIVACY_BANDO_TESTO} *{" "}
              <Link href="/legal/privacy" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
                Leggi l&apos;informativa
              </Link>
            </Consenso>
            <Consenso checked={consensoMarketing} onChange={setConsensoMarketing}>
              {CONSENSO_MARKETING_BANDO_TESTO}
            </Consenso>
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: "#E74C6F", fontSize: 14, margin: 0, lineHeight: 1.6 }} role="alert">
          {error}
        </p>
      )}

      {/* Navigazione */}
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
            {loading ? "Invio in corso…" : "Invia la candidatura"}
          </Button>
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-light)", margin: 0, textAlign: "center", lineHeight: 1.6 }}>
        Candidandoti crei (o colleghi) un account nel Member Portal della Fondazione, così potrai
        rientrare e aggiornare la candidatura fino al {CANDIDATURE_SCADENZA_LABEL}.
      </p>
    </form>
  );
}
