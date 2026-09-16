/**
 * Tipi e validazione di squadre, richieste di ingresso, progetti e schede
 * della Commissione del percorso universitario.
 *
 * Come gli altri moduli `universita-*`: nessuna dipendenza da React o da
 * Supabase, cosi lo stesso codice gira nella console, per il riscontro
 * immediato, e nell'API, dove la validazione e quella che conta davvero.
 */

import {
  BOARD_NOTA_MAX,
  CAMPI_PROGETTO_UNIVERSITA,
  CAMPI_PUNTEGGIO_UNIVERSITA,
  RICHIESTA_MESSAGGIO_MAX,
  SQUADRA_MAX,
  SQUADRA_MIN,
  SQUADRA_NOME_MAX,
  TITOLO_MAX_UNIVERSITA,
  type CampoProgettoUniversita,
  type CampoPunteggioUniversita,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/* ── Squadre ──────────────────────────────────────────────────────────── */

export type SquadraInput = {
  nome: string;
};

/**
 * Codice della squadra, che il capitano passa a chi conosce gia. Stesso
 * alfabeto senza caratteri ambigui del codice della candidatura: si detta a
 * voce, e una I scambiata per 1 manda una persona nella squadra sbagliata o,
 * piu spesso, in nessuna.
 *
 * Il prefisso e `UST-` e non `SQ-` di proposito: un codice universitario e
 * uno dei licei non devono potersi confondere nemmeno per sbaglio, perche
 * finiscono in due elenchi diversi che nessuna schermata mostra insieme.
 */
export const CODICE_SQUADRA_UNIVERSITA_RE = /^UST-[A-HJ-NP-Z2-9]{6}$/;

export function generateCodiceSquadraUniversita(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `UST-${code}`;
}

export function normalizzaCodiceSquadraUniversita(v: string): string {
  const pulito = v.trim().toUpperCase().replace(/[\s.]/g, "");
  if (/^UST[A-HJ-NP-Z2-9]{6}$/.test(pulito)) return `UST-${pulito.slice(3)}`;
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
  const c = normalizzaCodiceSquadraUniversita(testo(codice));
  if (!c) return "Inserisci il codice della squadra.";
  if (!CODICE_SQUADRA_UNIVERSITA_RE.test(c))
    return "Il codice non sembra valido: è nel formato UST- seguito da sei caratteri. Chiedilo a chi ha creato la squadra.";
  return null;
}

/* ── Bacheca e richieste di ingresso ──────────────────────────────────── */

export type BoardInput = {
  cerca_squadra: boolean;
  consenso_board: boolean;
  board_nota: string;
};

/**
 * Il consenso e obbligatorio solo per comparire, non per esistere.
 *
 * Chi spegne `cerca_squadra` sta uscendo dalla bacheca, e chiedergli in quel
 * momento di riconfermare un consenso sarebbe la cosa piu vicina a un muro
 * fra una persona e il diritto di sparire da un elenco.
 */
export function validateBoard(input: Partial<BoardInput>): string | null {
  const nota = testo(input.board_nota);
  if (nota.length > BOARD_NOTA_MAX)
    return `La nota per la bacheca supera i ${BOARD_NOTA_MAX} caratteri.`;

  if (input.cerca_squadra && !input.consenso_board)
    return "Per comparire in bacheca serve il consenso: senza, non possiamo mostrare il tuo nome agli altri partecipanti.";

  return null;
}

export function validateMessaggioRichiesta(messaggio: unknown): string | null {
  const m = testo(messaggio);
  if (m.length > RICHIESTA_MESSAGGIO_MAX)
    return `Il messaggio supera i ${RICHIESTA_MESSAGGIO_MAX} caratteri.`;
  return null;
}

/* ── Progetti ─────────────────────────────────────────────────────────── */

export type ProgettoInput = {
  titolo: string;
  ambito: string;
  ipotesi: string;
  stato_arte: string;
  metodo: string;
  integrazione: string;
  impatto: string;
  etica: string;
  link_materiali?: string;
};

const AMBITI_VALIDI = new Set(["sanitario", "ambientale", "industriale", "sportivo"]);

/**
 * Valida la bozza: qui si controlla solo che quello che c'e stia nei limiti,
 * non che ci sia tutto. Una bozza incompleta e il caso normale, ed e il
 * motivo per cui esiste.
 */
export function validateBozza(input: Partial<ProgettoInput>): string | null {
  if (testo(input.titolo).length > TITOLO_MAX_UNIVERSITA)
    return `Il titolo non può superare i ${TITOLO_MAX_UNIVERSITA} caratteri.`;

  if (input.ambito !== undefined && testo(input.ambito) && !AMBITI_VALIDI.has(testo(input.ambito)))
    return "L'ambito deve essere sanitario, ambientale, industriale o sportivo.";

  for (const c of CAMPI_PROGETTO_UNIVERSITA) {
    const v = testo(input[c.campo as CampoProgettoUniversita]);
    if (v.length > c.max)
      return `"${c.label}" supera i ${c.max} caratteri. Sintetizzate: fa parte del mestiere.`;
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
 * `componenti` non e un dettaglio del modulo ma il vincolo dell'art. 4: il
 * progetto e un lavoro di team, e una persona da sola non e un team. Il
 * controllo sta qui e non nel database perche il minimo si verifica al
 * momento della consegna, non a ogni ingresso: una squadra nasce con il suo
 * fondatore, e rifiutarla al primo minuto non avrebbe senso.
 */
export function validateConsegna(
  input: Partial<ProgettoInput>,
  componenti: number,
): string | null {
  const limiti = validateBozza(input);
  if (limiti) return limiti;

  if (componenti < SQUADRA_MIN)
    return `Per consegnare servono almeno ${SQUADRA_MIN} componenti. L'art. 4 parla di team, e una persona sola non è un team: usate la bacheca per trovare chi manca.`;

  if (componenti > SQUADRA_MAX)
    return `Una squadra non può superare i ${SQUADRA_MAX} componenti.`;

  if (!testo(input.titolo)) return "Manca il titolo del progetto.";

  if (!testo(input.ambito) || !AMBITI_VALIDI.has(testo(input.ambito)))
    return "Scegliete l'ambito: sanitario, ambientale, industriale o sportivo.";

  for (const c of CAMPI_PROGETTO_UNIVERSITA) {
    if (!testo(input[c.campo as CampoProgettoUniversita]))
      return `Manca "${c.label}". La Commissione lo valuta: senza, perdete i punti di "${c.criterio}".`;
  }

  return null;
}

/**
 * Quanti campi del progetto sono compilati. Alimenta il contatore della
 * console, che e l'unico modo che una squadra ha di sapere quanto le manca
 * senza provare a consegnare e farsi dire di no.
 */
export function completezzaProgetto(input: Partial<ProgettoInput>): {
  fatti: number;
  totale: number;
} {
  const totale = CAMPI_PROGETTO_UNIVERSITA.length + 2; // piu titolo e ambito
  let fatti = 0;
  if (testo(input.titolo)) fatti++;
  if (testo(input.ambito)) fatti++;
  for (const c of CAMPI_PROGETTO_UNIVERSITA) {
    if (testo(input[c.campo as CampoProgettoUniversita])) fatti++;
  }
  return { fatti, totale };
}

/* ── Schede della Commissione ─────────────────────────────────────────── */

export type ValutazioneInput = Partial<Record<CampoPunteggioUniversita, number | null>> & {
  nota?: string;
  pubblicabile?: string | null;
};

const GIUDIZI_VALIDI = new Set(["si", "forse", "no"]);

/**
 * Valida una scheda in lavorazione: ogni punteggio presente deve stare nel
 * suo intervallo. I vuoti sono ammessi, perche una scheda si compila in piu
 * riprese e salvarla a meta e il caso normale.
 */
export function validateScheda(input: ValutazioneInput): string | null {
  for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) {
    const v = input[c.campo as CampoPunteggioUniversita];
    if (v === undefined || v === null) continue;
    if (typeof v !== "number" || Number.isNaN(v))
      return `Il punteggio di "${c.criterio}" deve essere un numero.`;
    if (v < 0 || v > c.max)
      return `Il punteggio di "${c.criterio}" va da 0 a ${c.max}.`;
  }

  if (input.nota !== undefined && testo(input.nota).length > 4000)
    return "La nota supera i 4000 caratteri.";

  const g = input.pubblicabile;
  if (g !== undefined && g !== null && g !== "" && !GIUDIZI_VALIDI.has(String(g)))
    return "Il giudizio sulla pubblicabilità non è valido.";

  return null;
}

/**
 * Valida la chiusura della scheda, che e un'altra cosa: un voto si consegna
 * intero. Una scheda chiusa con tre criteri su sei entrerebbe in media
 * pesando come una completa, e abbasserebbe un progetto per una distrazione
 * di chi lo giudica invece che per il suo merito.
 */
export function validateChiusuraScheda(input: ValutazioneInput): string | null {
  const limiti = validateScheda(input);
  if (limiti) return limiti;

  for (const c of CAMPI_PUNTEGGIO_UNIVERSITA) {
    const v = input[c.campo as CampoPunteggioUniversita];
    if (v === undefined || v === null)
      return `Manca il punteggio di "${c.criterio}". Una scheda si consegna intera: se ne manca uno, la media la conta lo stesso come completa.`;
  }

  return null;
}

/** Somma dei punteggi presenti. La verita resta la colonna generata a database. */
export function totaleScheda(input: ValutazioneInput): number {
  return CAMPI_PUNTEGGIO_UNIVERSITA.reduce((s, c) => {
    const v = input[c.campo as CampoPunteggioUniversita];
    return s + (typeof v === "number" && !Number.isNaN(v) ? v : 0);
  }, 0);
}

/* ── Errori del database, tradotti ────────────────────────────────────── */

/**
 * I vincoli veri stanno a database, e quando scattano parlano in postgrese.
 * Questa funzione e il punto in cui quel linguaggio diventa una frase che
 * una persona puo leggere e agire. Torna `null` per gli errori che non
 * riguardano un vincolo previsto: quelli restano un 500 e vanno nei log.
 */
export function messaggioErroreDb(messaggio: string): string | null {
  if (messaggio.includes("squadra_piena"))
    return `Questa squadra ha già ${SQUADRA_MAX} componenti, che è il massimo.`;
  if (messaggio.includes("squadra_sciolta"))
    return "Questa squadra non è più attiva.";
  if (messaggio.includes("candidatura_non_confermata"))
    return "La tua candidatura non risulta confermata, quindi non puoi ancora entrare in una squadra.";
  if (messaggio.includes("universita_squadre_nome_key"))
    return "C'è già una squadra con questo nome. Sceglietene un altro.";
  if (messaggio.includes("universita_squadre_un_solo_capo"))
    return "Questa squadra ha già un capitano.";
  if (messaggio.includes("universita_richieste_coppia"))
    return "Hai già una richiesta per questa squadra.";
  return null;
}
