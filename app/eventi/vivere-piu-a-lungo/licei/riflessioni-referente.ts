/**
 * Il docente referente legge le riflessioni dei suoi studenti, da una data.
 *
 * Le scuole hanno chiesto di vedere che cosa scrivono i loro studenti alla
 * fine di ogni lezione. Il referente vede la sola riflessione: domanda e
 * commento lo studente li indirizza alla Fondazione. Fino a questa funzione
 * le informative dicevano il contrario: il referente vedeva quante lezioni
 * uno studente aveva completato,
 * non che cosa aveva scritto, e le riflessioni le leggeva solo la Fondazione.
 * Molti studenti sono minorenni e hanno scritto fidandosi di quella frase.
 *
 * Per questo vale solo da una data in avanti, e la data e una sola, qui:
 *
 * - finche e `null` non cambia niente, in nessun punto. La rotta del
 *   referente non restituisce testi, l'avviso nelle lezioni non compare e le
 *   informative restano quelle di prima. Si puo rilasciare il codice prima
 *   che i testi siano stati controllati;
 * - quando si imposta (formato `AAAA-MM-GG`), nello stesso rilascio si
 *   accendono il pannello del referente, l'avviso sopra il campo della
 *   riflessione e i testi aggiornati di informative, regolamento e privacy.
 *
 * Il referente vede solo le consegne salvate da quella data in poi: una
 * riflessione scritta prima resta della Fondazione, a meno che lo studente
 * non la modifichi dopo, sapendo che la leggera anche il docente. L'avviso
 * nella lezione glielo dice prima che salvi.
 *
 * Il modulo non importa niente di proposito: lo leggono le informative, la
 * privacy del sito, una rotta server e due componenti client.
 */
export const RIFLESSIONI_AL_REFERENTE_DAL: string | null = null;

/** L'istante da cui le consegne sono visibili al referente, o null se la funzione e spenta. */
export function riflessioniAlReferenteDal(): Date | null {
  if (!RIFLESSIONI_AL_REFERENTE_DAL) return null;
  // Mezzanotte dell'ora solare italiana. Non e mai prima della mezzanotte
  // italiana: con l'ora legale parte all'una, e l'errore sta dal lato giusto,
  // cioe una riflessione in meno al referente e mai una scritta il giorno prima.
  const d = new Date(`${RIFLESSIONI_AL_REFERENTE_DAL}T00:00:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** La data per i testi, per esempio "12 ottobre 2026". Stringa vuota se spenta. */
export function riflessioniAlReferenteDalLabel(): string {
  const d = riflessioniAlReferenteDal();
  if (!d) return "";
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

/** Una consegna salvata in questo momento e visibile al referente? */
export function consegnaVisibileAlReferente(salvataIl: string | null | undefined): boolean {
  const dal = riflessioniAlReferenteDal();
  if (!dal || !salvataIl) return false;
  const t = new Date(salvataIl).getTime();
  return !Number.isNaN(t) && t >= dal.getTime();
}
