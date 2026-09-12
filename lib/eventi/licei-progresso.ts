import { SUBMITTABLE_LESSONS } from "@/app/courses/course-data";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quanto lontano e arrivato ogni studente nel corso.
 *
 * Il dato c'era gia e non lo guardava nessuno. Ogni lezione si chiude con una
 * riflessione, la riflessione si salva in `lesson_submissions`, e finche non
 * e salvata la lezione successiva resta bloccata. Quindi il numero di righe
 * che uno studente ha in quella tabella e esattamente quante lezioni ha
 * portato a termine: non una stima, non "ha aperto la pagina", ma il punto in
 * cui e arrivato.
 *
 * Il conteggio si fa qui e non in SQL di proposito. `lesson_submissions` e
 * l'unica tabella del progetto che non ha una migrazione nel repository: e
 * stata creata fuori banda e vive solo in produzione. Una funzione SQL che ci
 * si appoggia farebbe fallire l'intera catena di migrazioni su un ambiente
 * nuovo, dove quella tabella non esiste. Una query normale invece fallisce da
 * sola, e sopra ci si puo mettere una degradazione morbida.
 *
 * Il vincolo di unicita su (lesson_slug, user_id) e quello che rende il
 * conteggio corretto: una riga per lezione, quindi contare le righe di uno
 * studente e contare le sue lezioni, senza bisogno di leggere quale.
 */

/**
 * Il denominatore di ogni "9 su 21".
 *
 * Sono le lezioni che si possono davvero consegnare, non tutte quelle
 * dichiarate. L'introduzione non ha una pagina sua, vive sulla pagina del
 * corso e la navigazione porta li: non ha una riflessione di chiusura, quindi
 * nessuno potra mai consegnarla. Contandola, uno studente che ha finito tutto
 * si fermerebbe a uno dalla fine e non arriverebbe mai al 100%, e a novembre
 * sembrerebbe che nessuno ha completato il percorso.
 */
export const TOTALE_LEZIONI = SUBMITTABLE_LESSONS.length;

export type ProgressoPerUtente = Map<string, number>;

/**
 * Lezioni completate per ciascuno degli utenti indicati.
 *
 * Chi non ha mai consegnato una riflessione non compare nella mappa: chi
 * legge usa `?? 0`. Distinguere "zero" da "assente" non serve a niente qui, e
 * riempire la mappa di zeri costerebbe una riga per studente senza dire
 * niente di piu.
 *
 * Si seleziona il solo `user_id`, non anche `lesson_slug`: per contare basta,
 * e su qualche migliaio di righe la differenza si vede. Se un giorno gli
 * studenti diventassero troppi perche questo regga, il rimedio e una funzione
 * SQL che aggreghi a database, possibile solo dopo aver dato una migrazione a
 * `lesson_submissions`.
 */
export async function progressoPerUtenti(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<any, "public", any>,
  userIds: string[],
): Promise<ProgressoPerUtente> {
  const progresso: ProgressoPerUtente = new Map();

  const ids = [
    ...new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  ];
  if (ids.length === 0) return progresso;

  // A blocchi, e non in una `in` sola, per due limiti diversi che si
  // romperebbero tutti e due in silenzio.
  //
  // Il primo e la lunghezza della URL: PostgREST riceve i filtri nella query
  // string, un uuid sono una quarantina di caratteri, e gia con qualche
  // centinaio di studenti la richiesta viene rifiutata dal proxy.
  //
  // Il secondo e piu insidioso: PostgREST tronca le risposte oltre un tetto
  // di righe, senza dire niente. Uno studente ha al massimo una riga per
  // lezione, quindi un blocco di N studenti puo produrre N per TOTALE_LEZIONI
  // righe: con blocchi grandi si supererebbe il tetto e mancherebbero
  // lezioni, cioe il conteggio sarebbe sbagliato per difetto proprio per le
  // scuole piu avanti. Il blocco si dimensiona percio sul numero di lezioni,
  // non su un numero tondo scelto a occhio.
  const RIGHE_PER_RICHIESTA = 900;
  const BLOCCO = Math.max(10, Math.min(200, Math.floor(RIGHE_PER_RICHIESTA / Math.max(1, TOTALE_LEZIONI))));
  const blocchi: string[][] = [];
  for (let i = 0; i < ids.length; i += BLOCCO) blocchi.push(ids.slice(i, i + BLOCCO));

  const risposte = await Promise.all(
    blocchi.map((blocco) =>
      client
        .from("lesson_submissions")
        .select("user_id")
        .in("user_id", blocco)
        .limit(RIGHE_PER_RICHIESTA + 100),
    ),
  );

  const error = risposte.find((r) => r.error)?.error ?? null;
  const data = risposte.flatMap((r) => r.data ?? []);

  if (error) {
    // Degradazione morbida, e deliberata: il progresso e un di piu su ogni
    // schermata che lo mostra. Se la tabella manca o la query fallisce, il
    // referente deve comunque poter confermare i suoi studenti e lo staff
    // deve comunque vedere le adesioni. Chi legge una mappa vuota mostra
    // zero, che e sbagliato ma innocuo, mentre un errore qui spegnerebbe
    // due pannelli interi per un dato accessorio.
    console.error("Licei progresso corso: lettura fallita:", error.message);
    return progresso;
  }

  for (const riga of (data ?? []) as { user_id: string | null }[]) {
    if (!riga.user_id) continue;
    progresso.set(riga.user_id, (progresso.get(riga.user_id) ?? 0) + 1);
  }

  return progresso;
}
