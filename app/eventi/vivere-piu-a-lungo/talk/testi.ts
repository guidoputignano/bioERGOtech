/**
 * I testi dell'interfaccia dei talk, senza i dati dei talk.
 *
 * Stanno in un file a parte per una ragione precisa: i componenti client
 * (il riquadro dell'iscrizione, le schede nelle aree, il pannello staff) li
 * importano, e tutto cio che un componente client importa finisce nel
 * JavaScript pubblico del sito. `content.ts` contiene `TALKS`, e dentro
 * `TALKS` c'e il link della riunione, che deve arrivare ai soli iscritti.
 * Quindi: i componenti client importano da qui e mai da `content.ts`, e i
 * dati del talk li ricevono come props dalla pagina server, gia ripuliti
 * del link (`schedaTalk`).
 */

export const TESTI_TALK = {
  serie: "Talk con gli esperti",

  caricamento: "Verifico la tua iscrizione…",
  erroreCaricamento: "Non è stato possibile verificare l'iscrizione. Riprova fra poco.",
  riprova: "Riprova",

  concluso: "Il talk si è concluso.",
  conclusoNota: "Grazie a chi ha partecipato. I prossimi incontri compaiono nella pagina dei talk.",

  nonDisponibile: "Le iscrizioni aprono a breve.",
  nonDisponibileNota: "Puoi già aggiungere il talk al calendario.",

  accedi: "Accedi per iscriverti",
  accediNota: "Usa lo stesso account con cui segui le lezioni.",

  nonIdoneo: "I talk sono riservati a chi partecipa al percorso.",
  nonIdoneoNota: "Se ti sei iscritto a uno dei due percorsi, accedi con lo stesso account che usi per le lezioni.",
  percorsoLicei: "Percorso per i licei",
  percorsoUniversita: "Percorso universitario",

  iscriviti: "Iscriviti al talk",
  iscrivitiNota: "Un clic: registriamo solo la tua iscrizione, collegata al tuo account.",

  iscritto: "Sei iscritto",
  aggiungiCalendario: "Aggiungi al calendario",
  collegati: "Collegati al talk",
  linkInArrivo: "Il link per collegarti compare qui, agli iscritti, nei giorni prima del talk.",
  annulla: "Annulla iscrizione",
  annullaConferma: "Vuoi annullare l'iscrizione al talk?",

  esauriti: "Posti esauriti",
  esauritiNota: "Sono stati presi tutti i posti disponibili per questo talk.",

  googleCalendar: "Google Calendar",
  ics: "Apple Calendar e Outlook (.ics)",

  vaiAlTalk: "Vai al talk",
} as const;

/** Le etichette dei ruoli, come le legge lo staff. */
export const RUOLI_TALK_LABEL: Record<string, string> = {
  studente_licei: "Studente licei",
  studente_universita: "Studente università",
  docente: "Docente",
  staff: "Staff",
};

/** Il ruolo come etichetta, con ripiego sul valore grezzo. */
export const ruoloTalkLabel = (ruolo: string): string => RUOLI_TALK_LABEL[ruolo] ?? ruolo;
