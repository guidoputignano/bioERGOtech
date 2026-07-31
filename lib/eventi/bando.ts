/**
 * Tipi e validazione condivisi dal bando "Showcase di Innovazione".
 *
 * Nessuna dipendenza da React o da Supabase: lo stesso modulo gira nel form
 * (per abilitare il pulsante di invio) e nell'API (dove la validazione è
 * quella che conta davvero, perché il client non è affidabile).
 */

import {
  AMBITI,
  ALLEGATI,
  CATEGORIE_BANDO,
  CATEGORIA_B_MESI_MAX,
  CANDIDATURE_SCADENZA_ISO,
  MAX_FILE_EXTRA,
  OBIETTIVI_CATEGORIA_C,
  SOGLIA_RACCOLTA_EUR,
  STADI_CATEGORIA_A,
  STRUMENTI_RACCOLTA,
  type CampoAllegato,
  type CategoriaBandoId,
} from "@/app/eventi/vivere-piu-a-lungo/bando/content";

/* ── Payload del form ─────────────────────────────────────────────────── */

/** Un allegato già caricato: percorso nello storage privato e nome originale. */
export type AllegatoCaricato = {
  path: string;
  nome: string;
  size: number;
};

export type BandoInput = {
  /** Cartella di lavoro degli allegati. UUID generato dal client. */
  draft_id: string;
  categoria: CategoriaBandoId;

  // Progetto
  progetto_nome: string;
  progetto_sintesi: string;
  ambiti: string[];

  // Proponente
  organizzazione?: string;
  forma_giuridica?: string;
  partita_iva?: string;
  data_costituzione?: string;
  paese: string;
  citta: string;
  sito_web?: string;

  // Referente
  referente_nome: string;
  referente_cognome: string;
  referente_ruolo?: string;
  referente_email: string;
  referente_telefono: string;
  referente_maggiorenne: boolean;

  // Team
  team_dimensione?: number;
  team_descrizione: string;

  // Descrizione del progetto (le voci richieste dall'art. 5)
  problema: string;
  soluzione: string;
  stato_avanzamento: string;
  impatto_atteso: string;
  aspetti_etici: string;

  // Categoria A
  a_stadio?: string;
  a_ente_ricerca?: string;

  // Categoria B
  b_stato_prototipo?: string;
  b_validazione?: string;
  b_raccolta_totale_eur?: number;
  b_modello_business?: string;

  // Categoria C
  c_raccolta_totale_eur?: number;
  c_ricavi_ultimo_anno_eur?: number;
  c_strumenti?: string[];
  c_round?: string;
  c_obiettivi?: string[];
  c_trazione?: string;

  // Allegati
  file_descrizione?: AllegatoCaricato | null;
  file_pitch_deck?: AllegatoCaricato | null;
  file_documentazione?: AllegatoCaricato | null;
  file_prospetto?: AllegatoCaricato | null;
  file_extra?: AllegatoCaricato[];

  // Materiale facoltativo non caricato come file
  video_url?: string;
  pubblicazioni?: string;
  brevetti?: string;

  // Ammissibilità (art. 3)
  presenza_taranto: boolean;
  edizioni_precedenti: boolean;
  edizioni_avanzamenti?: string;
  no_procedure_concorsuali?: boolean;

  // Dichiarazioni
  dichiarazione_veridicita: boolean;
  accetta_bando: boolean;
  presa_atto_pubblicita: boolean;
  consenso_privacy: boolean;
  consenso_marketing?: boolean;

  /** Honeypot anti-spam. Deve restare vuoto. */
  website?: string;
};

export type BandoResult = {
  codice: string;
  aggiornata: boolean;
};

/* ── Utility ──────────────────────────────────────────────────────────── */

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string) => UUID_RE.test(v);

const AMBITI_VALIDI = new Set<string>(AMBITI.map((a) => a.value));
const CATEGORIE_VALIDE = new Set<string>(CATEGORIE_BANDO.map((c) => c.id));
const STADI_VALIDI = new Set<string>(STADI_CATEGORIA_A.map((s) => s.value));
const STRUMENTI_VALIDI = new Set<string>(STRUMENTI_RACCOLTA.map((s) => s.value));
const OBIETTIVI_VALIDI = new Set<string>(OBIETTIVI_CATEGORIA_C.map((o) => o.value));

const CAMPI_ALLEGATO = new Set<string>(ALLEGATI.map((a) => a.campo));

export const isCampoAllegato = (v: string): v is CampoAllegato => CAMPI_ALLEGATO.has(v);

/**
 * I percorsi degli allegati arrivano dal client, quindi non sono affidabili.
 * Accettiamo solo la forma esatta prodotta dalla rotta di upload, dentro la
 * cartella della bozza dichiarata: niente traversal, niente file altrui.
 */
export function isPathAllegatoValido(path: string, draftId: string): boolean {
  if (!isUuid(draftId)) return false;
  const re = new RegExp(
    `^candidature/${draftId.toLowerCase()}/(${[...CAMPI_ALLEGATO].join("|")})-\\d{10,}-[0-9a-z]{6}\\.pdf$`,
  );
  return re.test(path);
}

/** Costruisce il percorso di storage di un allegato. */
export function pathAllegato(draftId: string, campo: CampoAllegato, seed: string): string {
  return `candidature/${draftId.toLowerCase()}/${campo}-${seed}.pdf`;
}

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/**
 * Lunghezza minima per i campi discorsivi. Non è pignoleria: una risposta di
 * tre parole non è valutabile dalla Commissione e fa perdere tempo a tutti.
 */
export const MIN_TESTO_LUNGO = 60;

/** Le voci della descrizione del progetto richieste dall'art. 5. */
export const CAMPI_DESCRIZIONE: [keyof BandoInput, string][] = [
  ["problema", "il problema affrontato"],
  ["soluzione", "la soluzione proposta"],
  ["stato_avanzamento", "lo stato di avanzamento"],
  ["impatto_atteso", "l'impatto atteso"],
  ["aspetti_etici", "gli aspetti etici connessi"],
];

/* ── Validazione ──────────────────────────────────────────────────────── */

/**
 * Valida la candidatura. Ritorna il primo messaggio d'errore in italiano, o
 * null se tutto è a posto. Stessa funzione lato client e lato server.
 */
export function validateBando(input: Partial<BandoInput>): string | null {
  if (input.website && input.website.trim() !== "") return "Richiesta non valida.";

  if (!input.draft_id || !isUuid(input.draft_id)) return "Sessione di caricamento non valida. Ricarica la pagina.";

  const categoria = testo(input.categoria) as CategoriaBandoId;
  if (!CATEGORIE_VALIDE.has(categoria)) return "Seleziona la categoria di partecipazione.";

  // ── Progetto ──
  if (!testo(input.progetto_nome)) return "Indica il nome del progetto.";
  if (testo(input.progetto_nome).length > 160) return "Il nome del progetto è troppo lungo.";
  if (!testo(input.progetto_sintesi)) return "Scrivi una sintesi del progetto in una riga.";
  if (testo(input.progetto_sintesi).length > 300)
    return "La sintesi del progetto non deve superare i 300 caratteri.";

  const ambiti = Array.isArray(input.ambiti) ? input.ambiti : [];
  if (ambiti.length === 0) return "Seleziona almeno un ambito tematico.";
  for (const a of ambiti) if (!AMBITI_VALIDI.has(a)) return "Ambito tematico non valido.";

  // ── Referente (art. 3) ──
  if (!testo(input.referente_nome)) return "Indica il nome del referente di progetto.";
  if (!testo(input.referente_cognome)) return "Indica il cognome del referente di progetto.";
  if (!isEmail(testo(input.referente_email))) return "Inserisci un indirizzo email valido per il referente.";
  if (!testo(input.referente_telefono)) return "Indica un recapito telefonico del referente.";
  if (!input.referente_maggiorenne)
    return "Il bando richiede un referente di progetto maggiorenne.";

  // ── Sede e team ──
  if (!testo(input.paese)) return "Indica il paese del proponente.";
  if (!testo(input.citta)) return "Indica la città del proponente.";
  if (!testo(input.team_descrizione)) return "Descrivi il team e le competenze che lo compongono.";

  const teamSize = numero(input.team_dimensione);
  if (teamSize !== null && (teamSize < 1 || teamSize > 500))
    return "Il numero di componenti del team non è valido.";

  const sito = testo(input.sito_web);
  if (sito && !/^https?:\/\/.+\..+/i.test(sito))
    return "Il sito web deve iniziare con http:// o https://";

  const video = testo(input.video_url);
  if (video && !/^https?:\/\/.+\..+/i.test(video))
    return "Il link al video deve iniziare con http:// o https://";

  // ── Descrizione del progetto (art. 5) ──
  for (const [campo, etichetta] of CAMPI_DESCRIZIONE) {
    const v = testo(input[campo]);
    if (!v) return `Descrivi ${etichetta}.`;
    if (v.length < MIN_TESTO_LUNGO)
      return `La risposta su ${etichetta} è troppo breve: servono almeno ${MIN_TESTO_LUNGO} caratteri.`;
  }

  // ── Campi propri della categoria (art. 2) ──
  if (categoria === "A") {
    if (!STADI_VALIDI.has(testo(input.a_stadio)))
      return "Indica lo stadio del progetto: concetto, studio di fattibilità o proof of concept.";
  }

  if (categoria === "B" || categoria === "C") {
    if (!testo(input.organizzazione)) return "Indica la denominazione della società.";
    if (!testo(input.partita_iva)) return "Indica la partita IVA o il codice fiscale della società.";
    const costituzione = testo(input.data_costituzione);
    if (!costituzione) return "Indica la data di costituzione della società.";
    const d = new Date(costituzione);
    if (Number.isNaN(d.getTime())) return "La data di costituzione non è valida.";
    if (d.getTime() > Date.now()) return "La data di costituzione non può essere nel futuro.";
    if (!input.no_procedure_concorsuali)
      return "Per le categorie B e C devi dichiarare l'assenza di procedure concorsuali in corso.";
  }

  if (categoria === "B") {
    if (!testo(input.b_stato_prototipo))
      return "Descrivi lo stato del prototipo o dell'MVP.";
    if (!testo(input.b_modello_business))
      return "Descrivi il modello di business.";
    const raccolta = numero(input.b_raccolta_totale_eur);
    if (raccolta === null) return "Indica la raccolta di capitale complessiva, anche se pari a zero.";
    if (raccolta < 0) return "La raccolta di capitale non può essere negativa.";
    if (raccolta > SOGLIA_RACCOLTA_EUR)
      return `Una raccolta superiore a ${SOGLIA_RACCOLTA_EUR.toLocaleString("it-IT")} euro rientra nella categoria C. Cambia categoria per proseguire.`;
  }

  if (categoria === "C") {
    const raccolta = numero(input.c_raccolta_totale_eur) ?? 0;
    const ricavi = numero(input.c_ricavi_ultimo_anno_eur) ?? 0;
    if (raccolta < 0 || ricavi < 0) return "Gli importi non possono essere negativi.";
    if (raccolta < SOGLIA_RACCOLTA_EUR && ricavi <= 0)
      return `La categoria C richiede una raccolta pari o superiore a ${SOGLIA_RACCOLTA_EUR.toLocaleString("it-IT")} euro oppure ricavi consolidati. Se non ricorre nessuna delle due condizioni, candidati in categoria B.`;
    if (!testo(input.c_round))
      return "Sintetizza i round chiusi, gli importi e la destinazione dei proventi.";
    if (!testo(input.c_trazione)) return "Descrivi la trazione già dimostrata.";

    const strumenti = Array.isArray(input.c_strumenti) ? input.c_strumenti : [];
    if (raccolta > 0 && strumenti.length === 0)
      return "Indica la tipologia degli strumenti con cui hai raccolto.";
    for (const s of strumenti) if (!STRUMENTI_VALIDI.has(s)) return "Strumento di raccolta non valido.";

    const obiettivi = Array.isArray(input.c_obiettivi) ? input.c_obiettivi : [];
    if (obiettivi.length === 0) return "Indica che cosa cerchi: partnership, validazione clinica o un nuovo round.";
    for (const o of obiettivi) if (!OBIETTIVI_VALIDI.has(o)) return "Obiettivo non valido.";
  }

  // ── Allegati (art. 5) ──
  const draftId = input.draft_id!;
  const singoli: [CampoAllegato, AllegatoCaricato | null | undefined, string][] = [
    ["descrizione", input.file_descrizione, "la descrizione del progetto"],
    ["pitch_deck", input.file_pitch_deck, "il pitch deck"],
    ["documentazione", input.file_documentazione, "la documentazione societaria"],
    ["prospetto", input.file_prospetto, "il prospetto della raccolta"],
  ];
  for (const [campo, file, etichetta] of singoli) {
    const richiesto = ALLEGATI.find((a) => a.campo === campo)!.obbligatorioPer.includes(categoria);
    if (richiesto && !file?.path) return `Carica ${etichetta} in formato PDF.`;
    if (file?.path && !isPathAllegatoValido(file.path, draftId))
      return "Uno degli allegati non è valido. Ricaricalo e riprova.";
  }

  const extra = Array.isArray(input.file_extra) ? input.file_extra : [];
  if (extra.length > MAX_FILE_EXTRA)
    return `Puoi allegare al massimo ${MAX_FILE_EXTRA} file facoltativi.`;
  for (const f of extra) {
    if (!f?.path || !isPathAllegatoValido(f.path, draftId))
      return "Uno degli allegati facoltativi non è valido. Ricaricalo e riprova.";
  }

  // ── Ammissibilità e dichiarazioni (art. 3, 11, 13) ──
  if (!input.presenza_taranto)
    return "Il bando richiede la presenza di almeno un componente del team a Taranto l'11 dicembre 2026.";
  if (input.edizioni_precedenti && !testo(input.edizioni_avanzamenti))
    return "Se il progetto è già stato presentato, descrivi gli avanzamenti sostanziali intervenuti.";
  if (!input.dichiarazione_veridicita)
    return "Devi dichiarare la veridicità dei dati forniti.";
  if (!input.accetta_bando) return "Devi accettare integralmente le disposizioni del bando.";
  if (!input.presa_atto_pubblicita)
    return "Devi prendere atto che lo Showcase si svolge in seduta pubblica.";
  if (!input.consenso_privacy)
    return "Per candidarti devi acconsentire al trattamento dei dati personali.";

  return null;
}

/**
 * Segnalazioni non bloccanti sulla coerenza tra categoria scelta e dati
 * dichiarati. L'art. 2 lascia alla Commissione il potere di riassegnare
 * d'ufficio una candidatura, quindi non rifiutiamo: annotiamo, e la nota
 * finisce nel pannello dell'istruttoria.
 */
export function avvisiCategoria(input: Partial<BandoInput>): string[] {
  const avvisi: string[] = [];
  const categoria = testo(input.categoria);

  if (categoria === "B") {
    const costituzione = testo(input.data_costituzione);
    if (costituzione) {
      const d = new Date(costituzione);
      const limite = new Date(CANDIDATURE_SCADENZA_ISO);
      limite.setMonth(limite.getMonth() - CATEGORIA_B_MESI_MAX);
      if (!Number.isNaN(d.getTime()) && d.getTime() < limite.getTime()) {
        avvisi.push(
          `La società risulta costituita da più di ${CATEGORIA_B_MESI_MAX} mesi alla scadenza del bando.`,
        );
      }
    }
  }

  if (categoria === "A" && (testo(input.organizzazione) || testo(input.partita_iva))) {
    avvisi.push("Candidatura in categoria A con una società già indicata.");
  }

  if (categoria === "C") {
    const raccolta = numero(input.c_raccolta_totale_eur) ?? 0;
    const ricavi = numero(input.c_ricavi_ultimo_anno_eur) ?? 0;
    if (raccolta < SOGLIA_RACCOLTA_EUR && ricavi > 0) {
      avvisi.push(
        "Categoria C giustificata dai soli ricavi consolidati: la raccolta dichiarata è sotto la soglia.",
      );
    }
  }

  return avvisi;
}

/**
 * Codice univoco della candidatura. Formato BND-XXXXXXXX, senza caratteri
 * ambigui: compare nell'email e nel pannello dell'istruttoria.
 */
export function generateCodiceBando(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BND-${code}`;
}
