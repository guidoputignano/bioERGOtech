/**
 * La correzione dell'email di uno studente, dalla console dei docenti.
 *
 * Lo studente scrive l'email una volta sola, nel modulo di iscrizione, e un
 * refuso ("gmail.cpm") non si vede: l'account nasce con quell'indirizzo, il
 * link della password non arriva, e lo studente resta "Mai entrato" finche
 * qualcuno non se ne accorge. Prima la console diceva "ce lo segnali e lo
 * sistemiamo noi", ma neanche lo staff aveva uno strumento: si correggeva a
 * mano su Supabase. Ora il referente, o un docente del progetto, lo
 * corregge dalla riga dello studente.
 *
 * **Solo per un account mai usato.** Cambiare l'indirizzo di un account
 * vuol dire decidere chi ci entra: su un account che lo studente usa gia
 * sarebbe consegnarlo a chi scrive l'indirizzo nuovo. Un account che non ha
 * mai fatto l'accesso non ha password, lezioni ne dati: correggerlo non
 * toglie niente a nessuno. Se lo studente e gia entrato, la rotta rifiuta e
 * rimanda allo staff.
 *
 * Tre casi, a seconda dell'indirizzo nuovo:
 *
 * - **nessun account**: si cambia l'indirizzo dell'account dell'iscrizione
 *   (o se ne crea uno, se l'iscrizione non lo ha), e la riga lo segue;
 * - **un account c'e gia**: e il caso di chi, non riuscendo a entrare, si e
 *   registrato dal sito con l'indirizzo giusto e segue le lezioni fuori dal
 *   percorso. L'iscrizione passa a quell'account, cosi le lezioni gia fatte
 *   si contano; quello vecchio, mai usato, resta scollegato. Si rifiuta se
 *   l'account e dello staff, di un docente o referente, o e gia legato a
 *   un'altra iscrizione: sono gli stessi controlli del modulo pubblico, che
 *   lega anche lui l'account che trova per email;
 * - **l'account dell'iscrizione ha gia l'indirizzo nuovo** (una correzione
 *   rimasta a meta): si allinea la riga e basta.
 *
 * L'email con il link la manda la rotta, dopo, e solo a un'iscrizione in
 * attesa o confermata con un account mai entrato.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { STATI_ISCRIZIONE_ATTIVI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { escapeLike } from "@/lib/eventi/licei-docenti";
import { refusoEmail } from "@/lib/eventi/email-refusi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

/** Gli stati in cui l'email si corregge: anche "Non riconosciuta", che spesso e proprio l'indirizzo sbagliato. */
const STATI_CORREGGIBILI: ReadonlySet<string> = new Set(["in_attesa", "confermata", "rifiutata"]);

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const SCRIVA_ALLO_STAFF = "Ce lo segnali a info@bioergotech.org e lo sistemiamo noi.";

export type EsitoCorrezione =
  | {
      esito: "corretta";
      /** La riga aggiornata, con le colonne che vede un docente. */
      iscrizione: Record<string, unknown>;
      /** Che cosa e successo all'account: indirizzo cambiato, account nuovo, o collegato a uno che c'era. */
      account: "aggiornato" | "creato" | "collegato";
      /** L'account collegato e gia entrato nel corso: il link non serve. */
      giaEntrato: boolean;
      /** A chi mandare il link della password, o null se non va mandato. */
      daAvvisare: { iscrizioneId: string; nome: string; email: string } | null;
    }
  | {
      esito: "rifiutata";
      status: number;
      errore: string;
      /** L'indirizzo somiglia a un refuso: la console chiede di confermarlo. */
      richiedeConferma?: boolean;
      suggerimento?: string | null;
    };

const rifiuto = (status: number, errore: string): EsitoCorrezione => ({ esito: "rifiutata", status, errore });

export async function correggiEmailIscrizione(input: {
  client: Db;
  adesioneId: string;
  iscrizioneId: string;
  email: string;
  /** Il docente ha confermato un indirizzo che somiglia a un refuso. */
  confermata: boolean;
  /** Le colonne della riga da restituire: quelle che vede un docente. */
  colonne: string;
  /** Chi corregge, per i log. */
  autore: string;
}): Promise<EsitoCorrezione> {
  const { client, adesioneId, iscrizioneId, colonne } = input;
  const nuova = input.email.trim().toLowerCase();

  if (!isEmail(nuova)) return rifiuto(400, "L'indirizzo email non sembra valido.");
  const refuso = refusoEmail(nuova);
  if (refuso?.impossibile) {
    return rifiuto(
      400,
      refuso.suggerimento
        ? `«${refuso.dominio}» non esiste: forse è ${refuso.suggerimento}?`
        : `«${refuso.dominio}» non esiste: controlli l'indirizzo.`,
    );
  }
  if (refuso && !input.confermata) {
    return {
      esito: "rifiutata",
      status: 409,
      errore: `Controlli l'indirizzo: forse è ${refuso.suggerimento}?`,
      richiedeConferma: true,
      suggerimento: refuso.suggerimento,
    };
  }

  // ── L'iscrizione, solo del proprio istituto ──
  // Il filtro su adesione_id e la guardia: il client ha la service role key.
  const { data: iscrizione, error: erroreIscrizione } = await client
    .from("licei_iscrizioni")
    .select("id, nome, cognome, email, user_id, stato")
    .eq("id", iscrizioneId)
    .eq("adesione_id", adesioneId)
    .maybeSingle();
  if (erroreIscrizione) {
    console.error(`Licei correggi email: iscrizione ${iscrizioneId}: lettura non riuscita:`, erroreIscrizione.message);
    return rifiuto(500, "Non è stato possibile leggere l'iscrizione. Riprovi fra poco.");
  }
  if (!iscrizione) return rifiuto(404, "Iscrizione non trovata fra quelle del suo istituto.");
  if (!STATI_CORREGGIBILI.has(iscrizione.stato)) {
    return rifiuto(409, "Lo studente ha ritirato l'iscrizione: l'indirizzo non si corregge.");
  }
  if (String(iscrizione.email).trim().toLowerCase() === nuova) {
    return rifiuto(400, "È già questo l'indirizzo dell'iscrizione.");
  }

  // ── L'account dell'iscrizione non deve essere mai stato usato ──
  if (iscrizione.user_id) {
    const { data: attuale, error } = await client.auth.admin.getUserById(iscrizione.user_id);
    if (error || !attuale?.user) {
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account non letto:`, error?.message);
      return rifiuto(500, "Non è stato possibile verificare l'account dello studente. Riprovi fra poco.");
    }
    if (attuale.user.last_sign_in_at) {
      return rifiuto(
        409,
        `Lo studente è già entrato nel corso con questo account, quindi l'indirizzo non si cambia da qui. ${SCRIVA_ALLO_STAFF}`,
      );
    }
  }

  // ── L'indirizzo nuovo non deve essere gia di qualcun altro nel percorso ──
  const like = escapeLike(nuova);
  const [stessoIstituto, docentePerEmail, referentePerEmail, profili] = await Promise.all([
    client
      .from("licei_iscrizioni")
      .select("id")
      .eq("adesione_id", adesioneId)
      .ilike("email", like)
      .neq("id", iscrizioneId)
      .limit(1),
    client.from("licei_docenti").select("id").ilike("email", like).in("stato", ["invitato", "attivo"]).limit(1),
    client.from("licei_adesioni").select("id").ilike("referente_email", like).limit(1),
    client.from("profiles").select("id, partnership_level").eq("email", nuova).limit(2),
  ]);
  const erroreControlli = [
    stessoIstituto.error,
    referentePerEmail.error,
    profili.error,
    docentePerEmail.error && !erroreSchemaMancante(docentePerEmail.error, "tabella") ? docentePerEmail.error : null,
  ].find(Boolean);
  if (erroreControlli) {
    console.error(`Licei correggi email: iscrizione ${iscrizioneId}: controlli non riusciti:`, erroreControlli.message);
    return rifiuto(500, "Non è stato possibile completare i controlli. Riprovi fra poco.");
  }
  if ((stessoIstituto.data ?? []).length > 0) {
    return rifiuto(
      409,
      "Con questo indirizzo c'è già un'altra iscrizione del suo istituto: tenga quella e porti questa su «Non riconosciuta».",
    );
  }
  if ((docentePerEmail.data ?? []).length > 0 || (referentePerEmail.data ?? []).length > 0) {
    return rifiuto(409, "Questo indirizzo è di un docente del percorso e non può essere usato per uno studente.");
  }
  const trovati = (profili.data ?? []) as { id: string; partnership_level: string | null }[];
  if (trovati.length > 1) return rifiuto(409, `Questo indirizzo risulta su più account. ${SCRIVA_ALLO_STAFF}`);
  const esistente = trovati[0] ?? null;

  let userId: string | null = iscrizione.user_id ?? null;
  let account: "aggiornato" | "creato" | "collegato";
  let giaEntrato = false;

  if (esistente && esistente.id === iscrizione.user_id) {
    // L'account ha gia l'indirizzo nuovo: una correzione rimasta a meta.
    account = "aggiornato";
  } else if (esistente) {
    // ── Un account con l'indirizzo giusto c'e gia: l'iscrizione passa li ──
    if (esistente.partnership_level === "admin") {
      return rifiuto(409, "Questo indirizzo è di un account dello staff e non può essere usato per uno studente.");
    }
    const [altraIscrizione, docentePerAccount, referentePerAccount, utente] = await Promise.all([
      client.from("licei_iscrizioni").select("id").eq("user_id", esistente.id).neq("id", iscrizioneId).limit(1),
      client
        .from("licei_docenti")
        .select("id")
        .eq("user_id", esistente.id)
        .in("stato", ["invitato", "attivo"])
        .limit(1),
      client.from("licei_adesioni").select("id").eq("user_id", esistente.id).limit(1),
      client.auth.admin.getUserById(esistente.id),
    ]);
    const erroreAccount = [
      altraIscrizione.error,
      referentePerAccount.error,
      utente.error,
      docentePerAccount.error && !erroreSchemaMancante(docentePerAccount.error, "tabella")
        ? docentePerAccount.error
        : null,
    ].find(Boolean);
    if (erroreAccount || !utente.data?.user) {
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account esistente non verificato:`, erroreAccount?.message);
      return rifiuto(500, "Non è stato possibile completare i controlli. Riprovi fra poco.");
    }
    if ((docentePerAccount.data ?? []).length > 0 || (referentePerAccount.data ?? []).length > 0) {
      return rifiuto(409, "Questo indirizzo è di un docente del percorso e non può essere usato per uno studente.");
    }
    if ((altraIscrizione.data ?? []).length > 0) {
      return rifiuto(409, `Questo indirizzo risulta già iscritto al percorso con un'altra iscrizione. ${SCRIVA_ALLO_STAFF}`);
    }
    userId = esistente.id;
    account = "collegato";
    giaEntrato = Boolean(utente.data.user.last_sign_in_at);
  } else if (iscrizione.user_id) {
    // ── Nessun account con l'indirizzo nuovo: si corregge quello mai usato ──
    const { error } = await client.auth.admin.updateUserById(iscrizione.user_id, {
      email: nuova,
      email_confirm: true,
    });
    if (error) {
      // Di solito: l'indirizzo e gia di un account senza profilo.
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account non aggiornato:`, error.message);
      return rifiuto(409, `Non è stato possibile cambiare l'indirizzo dell'account. ${SCRIVA_ALLO_STAFF}`);
    }
    const { error: erroreProfilo } = await client.from("profiles").update({ email: nuova }).eq("id", iscrizione.user_id);
    if (erroreProfilo) {
      // L'accesso usa l'account, non il profilo: si va avanti, e lo si scrive.
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: profilo non aggiornato:`, erroreProfilo.message);
    }
    account = "aggiornato";
  } else {
    // ── L'iscrizione non aveva un account: lo si crea, come il modulo ──
    const { data: creato, error } = await client.auth.admin.createUser({
      email: nuova,
      email_confirm: true,
      user_metadata: { full_name: `${iscrizione.nome} ${iscrizione.cognome}` },
    });
    if (error || !creato.user) {
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account non creato:`, error?.message);
      return rifiuto(409, `Non è stato possibile creare l'account. ${SCRIVA_ALLO_STAFF}`);
    }
    userId = creato.user.id;
    account = "creato";
  }

  const { data: riga, error: erroreRiga } = await client
    .from("licei_iscrizioni")
    .update({ email: nuova, user_id: userId })
    .eq("id", iscrizioneId)
    .eq("adesione_id", adesioneId)
    .select(colonne)
    .maybeSingle();
  if (erroreRiga) {
    if (erroreRiga.code === "23505") {
      return rifiuto(409, "Con questo indirizzo c'è già un'altra iscrizione del suo istituto.");
    }
    // L'account e gia corretto: ripetere la correzione allinea la riga
    // (terzo caso qui sopra).
    console.error(`Licei correggi email: iscrizione ${iscrizioneId}: riga non aggiornata:`, erroreRiga.message);
    return rifiuto(500, "La correzione non è stata completata. Riprovi.");
  }
  if (!riga) return rifiuto(404, "Iscrizione non trovata fra quelle del suo istituto.");

  console.log(
    `Licei correggi email: iscrizione ${iscrizioneId}, docente ${input.autore}: account ${account}${giaEntrato ? ", gia entrato" : ""}.`,
  );

  return {
    esito: "corretta",
    iscrizione: riga as unknown as Record<string, unknown>,
    account,
    giaEntrato,
    daAvvisare:
      !giaEntrato && STATI_ISCRIZIONE_ATTIVI.has(iscrizione.stato)
        ? { iscrizioneId, nome: iscrizione.nome, email: nuova }
        : null,
  };
}
