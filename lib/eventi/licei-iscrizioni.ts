/**
 * Tipi e validazione dell'iscrizione di uno studente al percorso licei.
 *
 * Nessuna dipendenza da React o da Supabase: lo stesso modulo gira nel form,
 * per il feedback immediato, e nell'API, dove la validazione conta davvero.
 *
 * I campi raccolti sono cinque, e sono il minimo: nome, cognome, email,
 * classe, anno di corso. Chi aggiunge un campo qui aggiunge un dato di un
 * minore, quindi deve poter spiegare a che cosa serve.
 */

export type IscrizioneInput = {
  /** Codice dell'istituto, formato LIC-XXXXXXXX, dal docente referente. */
  codice: string;

  nome: string;
  cognome: string;
  email: string;
  classe: string;
  anno_corso: number;

  consenso_privacy: boolean;
  dichiara_autorizzazione: boolean;

  /** Honeypot anti-spam. Deve restare vuoto. */
  website?: string;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Il codice che il referente riceve via email: LIC- piu otto caratteri. */
export const CODICE_RE = /^LIC-[A-HJ-NP-Z2-9]{8}$/;

/**
 * Normalizza il codice come lo scriverebbe uno studente: maiuscolo, senza
 * spazi, con il trattino rimesso se lo ha perso copiandolo.
 */
export function normalizzaCodice(v: string): string {
  const pulito = v.trim().toUpperCase().replace(/[\s.]/g, "");
  if (/^LIC[A-HJ-NP-Z2-9]{8}$/.test(pulito)) {
    return `LIC-${pulito.slice(3)}`;
  }
  return pulito;
}

export function validateIscrizione(input: Partial<IscrizioneInput>): string | null {
  if (input.website && input.website.trim() !== "") return "Richiesta non valida.";

  const codice = normalizzaCodice(testo(input.codice));
  if (!codice) return "Inserisci il codice del tuo istituto.";
  if (!CODICE_RE.test(codice))
    return "Il codice non sembra valido: è nel formato LIC- seguito da otto caratteri. Chiedilo al tuo docente referente.";

  if (!testo(input.nome)) return "Inserisci il tuo nome.";
  if (!testo(input.cognome)) return "Inserisci il tuo cognome.";
  if (testo(input.nome).length > 80 || testo(input.cognome).length > 80)
    return "Nome o cognome troppo lunghi.";

  if (!isEmail(testo(input.email)))
    return "Inserisci un indirizzo email valido. Ti servirà per accedere alle lezioni.";

  if (!testo(input.classe)) return "Indica la tua classe, per esempio 4A.";
  if (testo(input.classe).length > 40) return "La classe è troppo lunga.";

  const anno = Number(input.anno_corso);
  if (![3, 4, 5].includes(anno))
    return "Il percorso è riservato agli studenti del triennio: terza, quarta o quinta.";

  if (!input.consenso_privacy)
    return "Per iscriverti devi acconsentire al trattamento dei tuoi dati.";
  if (!input.dichiara_autorizzazione)
    return "Devi dichiarare di aver consegnato, o di voler consegnare, il modulo di autorizzazione firmato alla tua scuola.";

  return null;
}
