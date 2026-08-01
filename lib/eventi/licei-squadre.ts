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
  type CampoProgetto,
  type CampoPunteggio,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

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
