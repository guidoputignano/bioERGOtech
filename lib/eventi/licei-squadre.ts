/**
 * Tipi e validazione di squadre, progetti e schede della Commissione.
 *
 * Come gli altri moduli `licei-*`: nessuna dipendenza da React o da
 * Supabase, cosi lo stesso codice gira nel form, per il feedback immediato,
 * e nell'API, dove la validazione e quella che conta davvero.
 */

import {
  CAMPI_PROGETTO,
  CRITERI_LICEI,
  SQUADRA_MAX,
  SQUADRA_MIN,
  SQUADRA_NOME_MAX,
  TITOLO_MAX,
  haFattoAccesso,
  type CampoProgetto,
  type CampoPunteggio,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { normalizzaClasse } from "@/lib/eventi/licei-iscrizioni";

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/* ── Squadre ──────────────────────────────────────────────────────────── */

export type SquadraInput = {
  nome: string;
};

/**
 * Codice della squadra, che il capitano passa ai compagni. Stesso alfabeto
 * senza caratteri ambigui del codice dell'istituto: si detta a voce in
 * classe, e una I scambiata per 1 manda uno studente nella squadra
 * sbagliata o, piu spesso, in nessuna.
 */
export const CODICE_SQUADRA_RE = /^SQ-[A-HJ-NP-Z2-9]{6}$/;

export function generateCodiceSquadra(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SQ-${code}`;
}

export function normalizzaCodiceSquadra(v: string): string {
  const pulito = v.trim().toUpperCase().replace(/[\s.]/g, "");
  if (/^SQ[A-HJ-NP-Z2-9]{6}$/.test(pulito)) return `SQ-${pulito.slice(2)}`;
  return pulito;
}

export function validateNomeSquadra(nome: unknown): string | null {
  const n = testo(nome);
  if (!n) return "Date un nome alla squadra.";
  if (n.length < 2) return "Il nome della squadra è troppo corto.";
  if (n.length > SQUADRA_NOME_MAX)
    return `Il nome della squadra non può superare i ${SQUADRA_NOME_MAX} caratteri.`;
  return null;
}

export function validateCodiceSquadra(codice: unknown): string | null {
  const c = normalizzaCodiceSquadra(testo(codice));
  if (!c) return "Inserisci il codice della squadra.";
  if (!CODICE_SQUADRA_RE.test(c))
    return "Il codice non sembra valido: è nel formato SQ- seguito da sei caratteri. Chiedilo a chi ha creato la squadra.";
  return null;
}

/* ── Quadro delle squadre, per i docenti ──────────────────────────────── */

/*
 * Il quadro che il referente e i docenti del progetto vedono nella console:
 * quali squadre si sono formate, con chi, e chi e rimasto fuori. Si calcola
 * dai dati che la rotta del referente manda gia, senza leggere niente di
 * nuovo, ed e in sola lettura: le squadre le formano gli studenti.
 *
 * Del quadro escono solo nome, cognome, classe, ruolo e stato
 * dell'iscrizione. Email, account e date di accesso restano fuori: al
 * monitoraggio non servono, e un quadro si guarda in piu persone di un
 * elenco.
 */

/**
 * Un'iscrizione come la riceve il quadro. Va bene cosi com'e quella della
 * rotta del referente, che ne porta di piu: qui si leggono solo questi campi.
 */
export type IscrizioneQuadroInput = {
  id?: string | null;
  /**
   * L'istituto dell'iscrizione. Se manca vale quello del quadro: la rotta
   * del referente legge gia le sole iscrizioni del proprio istituto.
   */
  adesione_id?: string | null;
  /** Un componente di un altro istituto, che la rotta segnala senza nome ne classe. */
  altro_istituto?: boolean;
  nome?: string | null;
  cognome?: string | null;
  classe?: string | null;
  stato?: string | null;
  squadra_id?: string | null;
  squadra_ruolo?: string | null;
  /** Serve solo a dire "Mai entrato": la data non esce dal quadro. */
  ultimo_accesso?: string | null;
  lezioni_completate?: number | null;
};

type ProgettoQuadroInput = {
  stato?: string | null;
  titolo?: string | null;
  finalista?: boolean | null;
};

export type SquadraQuadroInput = {
  id: string;
  nome?: string | null;
  created_at?: string | null;
  /** PostgREST lo manda come oggetto, perche squadra_id e unico, o come lista. */
  licei_progetti?: ProgettoQuadroInput | ProgettoQuadroInput[] | null;
};

/**
 * Un componente di una squadra. Uno di un altro istituto (oggi impossibile:
 * lo impedisce il trigger `licei_squadra_capienza`) si conta e basta, senza
 * nome ne classe: se un giorno le regole cambiassero, il quadro non
 * diventerebbe un canale fra scuole.
 */
export type ComponenteQuadro =
  | {
      altroIstituto: false;
      id: string;
      nome: string;
      cognome: string;
      classe: string;
      capitano: boolean;
      /** Falso se l'iscrizione non e piu 'confermata': il quadro lo segnala. */
      confermata: boolean;
      stato: string;
    }
  | { altroIstituto: true; capitano: boolean };

/** Lo stato che il badge della squadra dice a parole. */
export type StatoSquadraQuadro = "sotto_minimo" | "bozza" | "consegnato" | "finalista" | "ritirato";

export type SquadraQuadro = {
  id: string;
  nome: string;
  created_at: string | null;
  progetto: { stato: string; titolo: string; finalista: boolean } | null;
  capitano: ComponenteQuadro | null;
  /** Gli altri componenti, senza il capitano. */
  membri: ComponenteQuadro[];
  /** Tutti i componenti, capitano compreso: e il "n su 5". */
  n: number;
  /** Meno di SQUADRA_MIN componenti e progetto non ancora consegnato. */
  sottoMinimo: boolean;
  stato: StatoSquadraQuadro;
};

export type StudenteSenzaSquadra = {
  id: string;
  nome: string;
  cognome: string;
  classe: string;
  maiEntrato: boolean;
  lezioniCompletate: number;
};

export type ClasseSenzaSquadra = {
  /** La classe normalizzata, "" se lo studente non l'ha indicata. */
  chiave: string;
  /** Come la si legge: la scrittura piu frequente fra gli iscritti di quella classe. */
  etichetta: string;
  studenti: StudenteSenzaSquadra[];
};

export type QuadroSquadreVista = {
  squadre: SquadraQuadro[];
  /** I confermati senza squadra, per classe. */
  senzaSquadra: ClasseSenzaSquadra[];
  /** In attesa di conferma e senza squadra: finche non li si conferma, non possono entrarci. */
  inAttesa: number;
  numeri: {
    squadre: number;
    confermati: number;
    inSquadra: number;
    senzaSquadra: number;
    sottoMinimo: number;
  };
};

const perNome = (a: { cognome: string; nome: string }, b: { cognome: string; nome: string }) =>
  a.cognome.localeCompare(b.cognome, "it", { sensitivity: "base" }) ||
  a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });

/**
 * Il quadro delle squadre di un istituto.
 *
 * `classi` e il filtro della console, gia normalizzato (null per tutto
 * l'istituto). E un filtro e non un confine: una squadra compare se ha
 * almeno un componente di quelle classi, e compare con tutti i suoi
 * componenti, perche le squadre attraversano le classi e una squadra a meta
 * direbbe una cosa falsa. I numeri e chi e senza squadra seguono il filtro.
 */
export function quadroSquadre(
  iscrizioni: readonly IscrizioneQuadroInput[],
  squadre: readonly SquadraQuadroInput[],
  adesioneId: string,
  opzioni: { classi?: ReadonlySet<string> | null } = {},
): QuadroSquadreVista {
  const chiavi = opzioni.classi ?? null;
  const passa = (classe: string | null | undefined) => chiavi === null || chiavi.has(normalizzaClasse(classe));
  const daAltroIstituto = (r: IscrizioneQuadroInput) =>
    r.altro_istituto === true || (r.adesione_id != null && r.adesione_id !== adesioneId);

  // Per l'etichetta di ogni classe: le scritture usate, contate su tutto
  // l'istituto, con le stesse regole della select del filtro.
  const forme = new Map<string, Map<string, number>>();
  const perSquadra = new Map<string, IscrizioneQuadroInput[]>();
  for (const r of iscrizioni) {
    if (r.squadra_id) perSquadra.set(r.squadra_id, [...(perSquadra.get(r.squadra_id) ?? []), r]);
    if (daAltroIstituto(r)) continue;
    const chiave = normalizzaClasse(r.classe);
    if (!chiave) continue;
    const forma = String(r.classe).trim();
    const conteggio = forme.get(chiave) ?? new Map<string, number>();
    conteggio.set(forma, (conteggio.get(forma) ?? 0) + 1);
    forme.set(chiave, conteggio);
  }
  const etichetta = (chiave: string): string => {
    const f = forme.get(chiave);
    if (!f) return chiave;
    return [...f.entries()].sort(
      (a, b) =>
        b[1] - a[1] ||
        Number(b[0].toUpperCase() === chiave) - Number(a[0].toUpperCase() === chiave) ||
        a[0].length - b[0].length ||
        a[0].localeCompare(b[0]),
    )[0][0];
  };

  const vistaSquadre: SquadraQuadro[] = [];
  for (const s of squadre) {
    const righe = perSquadra.get(s.id) ?? [];
    if (chiavi !== null && !righe.some((r) => !daAltroIstituto(r) && passa(r.classe))) continue;

    // Il capitano in testa, poi gli altri per cognome, quelli di un altro
    // istituto in fondo. Il capitano e uno solo (lo garantisce un indice
    // univoco): se per un errore ce ne fossero due, il secondo resta fra i
    // componenti.
    let capitano: ComponenteQuadro | null = null;
    const stessi: Extract<ComponenteQuadro, { altroIstituto: false }>[] = [];
    const altri: ComponenteQuadro[] = [];
    for (const r of righe) {
      const capo: boolean = r.squadra_ruolo === "capo" && capitano === null;
      const c: ComponenteQuadro = daAltroIstituto(r)
        ? { altroIstituto: true, capitano: capo }
        : {
            altroIstituto: false,
            id: String(r.id ?? ""),
            nome: String(r.nome ?? "").trim(),
            cognome: String(r.cognome ?? "").trim(),
            classe: String(r.classe ?? "").trim(),
            capitano: capo,
            confermata: r.stato === "confermata",
            stato: String(r.stato ?? ""),
          };
      if (capo) capitano = c;
      else if (c.altroIstituto) altri.push(c);
      else stessi.push(c);
    }
    stessi.sort(perNome);

    const p = Array.isArray(s.licei_progetti) ? s.licei_progetti[0] : s.licei_progetti;
    const progetto = p
      ? { stato: String(p.stato ?? "bozza"), titolo: String(p.titolo ?? "").trim(), finalista: p.finalista === true }
      : null;
    const n = righe.length;
    // Il badge dice una cosa sola, la piu avanzata. Il minimo conta finche
    // il progetto non e consegnato: dopo non c'e piu niente da sistemare.
    const stato: StatoSquadraQuadro = progetto?.finalista
      ? "finalista"
      : progetto?.stato === "consegnato"
        ? "consegnato"
        : progetto?.stato === "ritirato"
          ? "ritirato"
          : n < SQUADRA_MIN
            ? "sotto_minimo"
            : "bozza";

    vistaSquadre.push({
      id: s.id,
      nome: String(s.nome ?? "").trim(),
      created_at: s.created_at ?? null,
      progetto,
      capitano,
      membri: [...stessi, ...altri],
      n,
      sottoMinimo: stato === "sotto_minimo",
      stato,
    });
  }
  vistaSquadre.sort(
    (a, b) =>
      (a.created_at ?? "￿").localeCompare(b.created_at ?? "￿") || a.nome.localeCompare(b.nome, "it"),
  );

  // I numeri e chi e rimasto fuori: solo gli studenti del proprio istituto.
  let confermati = 0;
  let inSquadra = 0;
  let inAttesa = 0;
  const senza = new Map<string, StudenteSenzaSquadra[]>();
  for (const r of iscrizioni) {
    if (daAltroIstituto(r) || !passa(r.classe)) continue;
    if (r.stato === "confermata") {
      confermati += 1;
      if (r.squadra_id) {
        inSquadra += 1;
        continue;
      }
      const chiave = normalizzaClasse(r.classe);
      senza.set(chiave, [
        ...(senza.get(chiave) ?? []),
        {
          id: String(r.id ?? ""),
          nome: String(r.nome ?? "").trim(),
          cognome: String(r.cognome ?? "").trim(),
          classe: String(r.classe ?? "").trim(),
          maiEntrato: !haFattoAccesso(r),
          lezioniCompletate: r.lezioni_completate ?? 0,
        },
      ]);
    } else if (r.stato === "in_attesa" && !r.squadra_id) {
      inAttesa += 1;
    }
  }

  // Le classi in ordine, quella non indicata in fondo.
  const senzaSquadra: ClasseSenzaSquadra[] = [...senza.entries()]
    .sort(([a], [b]) =>
      a === "" || b === ""
        ? Number(a === "") - Number(b === "")
        : a.localeCompare(b, "it", { numeric: true }),
    )
    .map(([chiave, studenti]) => ({
      chiave,
      etichetta: chiave ? etichetta(chiave) : "",
      studenti: studenti.sort(perNome),
    }));

  return {
    squadre: vistaSquadre,
    senzaSquadra,
    inAttesa,
    numeri: {
      squadre: vistaSquadre.length,
      confermati,
      inSquadra,
      senzaSquadra: confermati - inSquadra,
      sottoMinimo: vistaSquadre.filter((s) => s.sottoMinimo).length,
    },
  };
}

/* ── Progetti ─────────────────────────────────────────────────────────── */

export type ProgettoInput = {
  titolo: string;
  ambito: string;
  problema: string;
  soluzione: string;
  tecnologie: string;
  impatto: string;
  etica: string;
  metodo: string;
  link_materiali?: string;
};

const AMBITI_VALIDI = new Set(["sanitario", "ambientale", "industriale"]);

/**
 * Valida la bozza: qui si controlla solo che quello che c'e stia nei limiti,
 * non che ci sia tutto. Una bozza incompleta e il caso normale, ed e il
 * motivo per cui esiste.
 */
export function validateBozza(input: Partial<ProgettoInput>): string | null {
  if (testo(input.titolo).length > TITOLO_MAX)
    return `Il titolo non può superare i ${TITOLO_MAX} caratteri.`;

  if (input.ambito !== undefined && testo(input.ambito) && !AMBITI_VALIDI.has(testo(input.ambito)))
    return "L'ambito deve essere sanitario, ambientale o industriale.";

  for (const c of CAMPI_PROGETTO) {
    const v = testo(input[c.campo]);
    if (v.length > c.max)
      return `"${c.label}" supera i ${c.max} caratteri. Sintetizzate: fa parte del lavoro.`;
  }

  const link = testo(input.link_materiali);
  if (link) {
    if (link.length > 500) return "Il link dei materiali è troppo lungo.";
    if (!/^https?:\/\/.+\..+/i.test(link))
      return "Il link dei materiali deve iniziare con http:// o https://";
  }

  return null;
}

/**
 * Valida la consegna, che e un'altra cosa: qui tutto deve esserci, perche
 * dopo non si tocca piu ed e questo che la Commissione legge.
 *
 * `componenti` non e un dettaglio del form ma il vincolo dell'art. 3: il
 * progetto e un lavoro di squadra, e uno studente da solo non e una squadra.
 */
export function validateConsegna(
  input: Partial<ProgettoInput>,
  componenti: number,
): string | null {
  const limiti = validateBozza(input);
  if (limiti) return limiti;

  if (componenti < SQUADRA_MIN)
    return `Per consegnare la squadra deve avere almeno ${SQUADRA_MIN} componenti. Il progetto è un lavoro di squadra, l'art. 3 lo chiede esplicitamente.`;
  if (componenti > SQUADRA_MAX)
    return `Una squadra non può avere più di ${SQUADRA_MAX} componenti.`;

  if (!testo(input.titolo)) return "Date un titolo al progetto.";
  if (!testo(input.ambito))
    return "Indicate l'ambito del progetto: sanitario, ambientale o industriale.";

  for (const c of CAMPI_PROGETTO) {
    if (!testo(input[c.campo]))
      return `Manca "${c.label}". La Commissione lo valuta: senza, perdete i punti di "${c.criterio}".`;
  }

  return null;
}

/** I campi del progetto compilati su quelli totali, per la barra di avanzamento. */
export function completezzaProgetto(input: Partial<ProgettoInput>): {
  compilati: number;
  totali: number;
} {
  const campi: (CampoProgetto | "titolo" | "ambito")[] = [
    "titolo",
    "ambito",
    ...CAMPI_PROGETTO.map((c) => c.campo),
  ];
  let compilati = 0;
  for (const c of campi) {
    if (testo(input[c as keyof ProgettoInput])) compilati += 1;
  }
  return { compilati, totali: campi.length };
}

/* ── Schede della Commissione ─────────────────────────────────────────── */

export type ValutazioneInput = Partial<Record<CampoPunteggio, number | null>> & {
  nota?: string | null;
  chiusa?: boolean;
};

/** Il massimo di ciascun criterio, per campo. Viene dall'art. 7. */
export const MASSIMI_CRITERI: Record<CampoPunteggio, number> = Object.fromEntries(
  CRITERI_LICEI.map((c) => [c.campo, c.punti]),
) as Record<CampoPunteggio, number>;

/**
 * Valida una scheda. Con `chiusa` a true serve il punteggio su tutti e sei
 * i criteri: una scheda a meta non e un voto, e la media di un voto a meta
 * penalizza il progetto senza che nessuno lo abbia deciso.
 */
export function validateValutazione(input: ValutazioneInput): string | null {
  for (const c of CRITERI_LICEI) {
    const v = input[c.campo];
    if (v === undefined || v === null) {
      if (input.chiusa) return `Manca il punteggio per "${c.criterio}".`;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n)) return `Il punteggio per "${c.criterio}" non è un numero.`;
    if (n < 0 || n > c.punti)
      return `Il punteggio per "${c.criterio}" deve essere fra 0 e ${c.punti}.`;
  }

  if (input.nota != null && String(input.nota).length > 3000)
    return "La nota è troppo lunga.";

  return null;
}

/** Somma dei sei criteri, per l'anteprima nella scheda. Il database la ricalcola. */
export function totaleValutazione(input: ValutazioneInput): number {
  return CRITERI_LICEI.reduce((s, c) => s + (Number(input[c.campo]) || 0), 0);
}
