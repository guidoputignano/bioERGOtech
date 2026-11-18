/**
 * La modalità archivio dell'evento, in un modulo a sé.
 *
 * Sta qui, e non solo in content.ts, perché la legge anche la navbar, che è
 * in ogni pagina del sito: importando da qui il suo bundle non si porta
 * dietro programma, relatori e FAQ. content.ts la riesporta, quindi gli
 * import già esistenti continuano a funzionare.
 *
 * Per archiviare l'evento dopo la sua conclusione, imposta ARCHIVE_MODE a
 * true. I moduli di iscrizione spariscono, resta il programma, e nessun dato
 * viene cancellato.
 */

/** Quando true, nasconde i moduli di iscrizione e gli inviti a iscriversi. */
export const ARCHIVE_MODE = false;
