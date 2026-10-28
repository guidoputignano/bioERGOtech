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
 * - **nessun account**: si cambia l'indirizzo dell'account dell'iscrizione,
 *   ma solo se l'ha creato l'iscrizione stessa e non ha altri ruoli sul
 *   sito (`altroRuoloDellAccount`); altrimenti, o se l'iscrizione non ne ha
 *   uno, se ne crea uno nuovo e la riga lo segue. Senza quella condizione un
 *   docente poteva legare a un finto studente l'account mai usato di
 *   qualcun altro e poi "correggerne" l'indirizzo con il proprio;
 * - **un account c'e gia**: e il caso di chi, non riuscendo a entrare, si e
 *   registrato dal sito con l'indirizzo giusto e segue le lezioni fuori dal
 *   percorso. L'iscrizione passa a quell'account, cosi le lezioni gia fatte
 *   si contano; quello vecchio, mai usato, resta scollegato. Si rifiuta se
 *   l'account ha un altro ruolo (staff, membro, docente o referente,
 *   commissario, universita, un'altra iscrizione): lo stesso controllo del
 *   modulo pubblico, che lega anche lui l'account che trova per email;
 * - **l'account dell'iscrizione ha gia l'indirizzo nuovo** (una correzione
 *   rimasta a meta): si allinea la riga e basta.
 *
 * **Un'iscrizione legata all'account di un altro.** Prima della correzione
 * della rotta dell'iscrizione, uno studente che si iscriveva da un computer
 * su cui era collegato il docente finiva sull'account del docente. Quella
 * riga non e dello studente: l'account non si tocca mai (ne email ne
 * altro), e la correzione, anche con lo stesso indirizzo, collega lo
 * studente a un account suo, trovato o creato con l'indirizzo dell'iscrizione.
 * La console le segnala con `accountAltrui` qui sotto.
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
    .select("id, nome, cognome, email, user_id, stato, created_at")
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

  // ── L'account dell'iscrizione: dello studente, e mai usato ──
  // Se non e dello studente (un'altra email, o l'account di un docente),
  // non si tocca: lo studente avra un account suo.
  let nonSuo = false;
  let diDocente = false;
  let attualeEntrato = false;
  // Si puo cambiare l'indirizzo dell'account solo se l'ha creato questa
  // iscrizione e non ha nessun altro ruolo sul sito. Altrimenti un docente
  // poteva iscrivere uno "studente" con l'email di un account mai usato di
  // qualcun altro (un commissario, un membro appena invitato), che il modulo
  // lega per email, e poi "correggerne" l'indirizzo con il proprio:
  // l'account, con i suoi ruoli, passava a lui. Se non si puo, lo studente
  // riceve un account nuovo e quello resta com'e.
  let rinominabile = false;
  if (iscrizione.user_id) {
    const [{ data: attuale, error }, docenti] = await Promise.all([
      client.auth.admin.getUserById(iscrizione.user_id),
      accountDocenti(client, adesioneId),
    ]);
    if (error || !attuale?.user || docenti === null) {
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account non letto:`, error?.message);
      return rifiuto(500, "Non è stato possibile verificare l'account dello studente. Riprovi fra poco.");
    }
    diDocente = docenti.has(iscrizione.user_id);
    attualeEntrato = Boolean(attuale.user.last_sign_in_at);
    if (!attualeEntrato && creatoDallIscrizione(attuale.user.created_at, iscrizione.created_at)) {
      const ruolo = await altroRuoloDellAccount(client, iscrizione.user_id, iscrizioneId);
      if (ruolo === undefined) {
        return rifiuto(500, "Non è stato possibile verificare l'account dello studente. Riprovi fra poco.");
      }
      rinominabile = ruolo === null;
    }
    nonSuo =
      diDocente ||
      String(attuale.user.email ?? "").trim().toLowerCase() !== String(iscrizione.email).trim().toLowerCase();
    if (!nonSuo && attuale.user.last_sign_in_at) {
      return rifiuto(
        409,
        `Lo studente è già entrato nel corso con questo account, quindi l'indirizzo non si cambia da qui. ${SCRIVA_ALLO_STAFF}`,
      );
    }
  }

  // Lo stesso indirizzo ha senso solo per ricollegare una riga legata
  // all'account di un altro.
  if (!nonSuo && String(iscrizione.email).trim().toLowerCase() === nuova) {
    return rifiuto(400, "È già questo l'indirizzo dell'iscrizione.");
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
    // L'account ha gia l'indirizzo nuovo: una correzione rimasta a meta, o
    // lo studente che si era iscritto collegato con un suo account e un'altra
    // email, e ora si scrive quella dell'account. Si allinea la riga. Mai
    // l'account di un docente: a quel punto l'hanno gia rifiutato i
    // controlli sull'email, e se il profilo e disallineato lo si ferma qui.
    if (diDocente) {
      return rifiuto(409, "Questo indirizzo è di un docente del percorso e non può essere usato per uno studente.");
    }
    account = "aggiornato";
    giaEntrato = attualeEntrato;
  } else if (esistente) {
    // ── Un account con l'indirizzo giusto c'e gia: l'iscrizione passa li ──
    const [ruolo, utente] = await Promise.all([
      altroRuoloDellAccount(client, esistente.id, iscrizioneId),
      client.auth.admin.getUserById(esistente.id),
    ]);
    if (ruolo === undefined || utente.error || !utente.data?.user) {
      console.error(`Licei correggi email: iscrizione ${iscrizioneId}: account esistente non verificato:`, utente.error?.message);
      return rifiuto(500, "Non è stato possibile completare i controlli. Riprovi fra poco.");
    }
    if (ruolo) return rifiuto(409, MESSAGGIO_ALTRO_RUOLO[ruolo]);
    userId = esistente.id;
    account = "collegato";
    giaEntrato = Boolean(utente.data.user.last_sign_in_at);
  } else if (iscrizione.user_id && !nonSuo && rinominabile) {
    // ── Nessun account con l'indirizzo nuovo: si corregge quello mai usato,
    // creato da questa iscrizione e senza altri ruoli ──
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
    // ── L'iscrizione non aveva un account suo, o il suo non si puo
    // rinominare: lo si crea, come il modulo. Quello di prima non si tocca ──
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

/* ── Iscrizioni legate all'account di un altro ─────────────────────────── */

/**
 * Gli account dei docenti di un istituto: il referente e i docenti del
 * progetto, anche revocati. Un'iscrizione legata a uno di questi non e
 * dello studente. Null se la lettura non riesce; senza la tabella dei
 * docenti, solo il referente.
 */
export async function accountDocenti(client: Db, adesioneId: string): Promise<Set<string> | null> {
  const [referente, docenti] = await Promise.all([
    client.from("licei_adesioni").select("user_id").eq("id", adesioneId).maybeSingle(),
    client.from("licei_docenti").select("user_id").eq("adesione_id", adesioneId),
  ]);
  if (referente.error || (docenti.error && !erroreSchemaMancante(docenti.error, "tabella"))) {
    console.error("Licei account dei docenti non letti:", (referente.error ?? docenti.error)?.message);
    return null;
  }
  const ids = new Set<string>();
  if (referente.data?.user_id) ids.add(referente.data.user_id);
  for (const d of (docenti.error ? [] : (docenti.data ?? [])) as { user_id: string | null }[]) {
    if (d.user_id) ids.add(d.user_id);
  }
  return ids;
}

/** Quanti id per richiesta: PostgREST li riceve nella query string. */
const BLOCCO_ID = 80;

/**
 * Le email degli account, dal profilo. Una mappa vuota se la lettura non
 * riesce: allora nessuna riga si segna per l'email, solo per i docenti.
 */
async function emailDegliAccount(client: Db, ids: string[]): Promise<Map<string, string>> {
  const email = new Map<string, string>();
  for (let i = 0; i < ids.length; i += BLOCCO_ID) {
    const { data, error } = await client
      .from("profiles")
      .select("id, email")
      .in("id", ids.slice(i, i + BLOCCO_ID));
    if (error) {
      console.error("Licei email degli account non lette:", error.message);
      return new Map();
    }
    for (const p of (data ?? []) as { id: string; email: string | null }[]) {
      if (p.email) email.set(p.id, p.email.trim().toLowerCase());
    }
  }
  return email;
}

/**
 * Di chi e l'account di ogni iscrizione legata a qualcun altro: "mio"
 * (di chi guarda la console), "docente" (di un altro docente
 * dell'istituto), "altro" (un account con un'altra email). Le iscrizioni
 * a posto non compaiono. Alla console non arriva l'email dell'altro account.
 */
export async function accountAltrui(
  client: Db,
  adesioneId: string,
  righe: { id: string; email: string; user_id: string | null }[],
  chiGuarda: string,
): Promise<Map<string, "mio" | "docente" | "altro">> {
  const legate = righe.filter((r): r is { id: string; email: string; user_id: string } => !!r.user_id);
  const [docenti, email] = await Promise.all([
    accountDocenti(client, adesioneId),
    emailDegliAccount(client, [...new Set(legate.map((r) => r.user_id))]),
  ]);
  const esito = new Map<string, "mio" | "docente" | "altro">();
  for (const r of legate) {
    if (r.user_id === chiGuarda) esito.set(r.id, "mio");
    else if (docenti?.has(r.user_id)) esito.set(r.id, "docente");
    else {
      const suaEmail = email.get(r.user_id);
      if (suaEmail && suaEmail !== String(r.email).trim().toLowerCase()) esito.set(r.id, "altro");
    }
  }
  return esito;
}

/* ── Altri ruoli di un account ─────────────────────────────────────────── */

export type AltroRuolo = "staff" | "membro" | "docente" | "iscrizione" | "commissione" | "universita";

export const MESSAGGIO_ALTRO_RUOLO: Record<AltroRuolo, string> = {
  staff: "Questo indirizzo è di un account dello staff e non può essere usato per uno studente.",
  membro: `Questo indirizzo è di un account della Fondazione e non può essere usato per uno studente. ${SCRIVA_ALLO_STAFF}`,
  docente: "Questo indirizzo è di un docente del percorso e non può essere usato per uno studente.",
  iscrizione: `Questo indirizzo risulta già iscritto al percorso con un'altra iscrizione. ${SCRIVA_ALLO_STAFF}`,
  commissione: `Questo indirizzo è di un componente di una commissione e non può essere usato per uno studente. ${SCRIVA_ALLO_STAFF}`,
  universita: `Questo indirizzo partecipa già al percorso universitario. ${SCRIVA_ALLO_STAFF}`,
};

/**
 * L'account ha un ruolo sul sito oltre all'iscrizione `tranne` (se data)?
 * Staff, membro o partner della Fondazione, docente o referente di un
 * qualunque istituto (anche revocato), un'altra iscrizione ai licei,
 * commissario dei licei o dell'universita, mentor o partecipante
 * dell'universita. Un account cosi non si rinomina e non si lega a uno
 * studente: sarebbe consegnarlo, con i suoi ruoli, a chi scrive l'indirizzo.
 * Torna il primo ruolo trovato, null se non ne ha, undefined se una lettura
 * non riesce (una tabella che manca conta come vuota).
 */
export async function altroRuoloDellAccount(
  client: Db,
  userId: string,
  tranne?: string,
): Promise<AltroRuolo | null | undefined> {
  const per = (tabella: string) => client.from(tabella).select("user_id").eq("user_id", userId).limit(1);
  const altreIscrizioni = tranne
    ? client.from("licei_iscrizioni").select("id").eq("user_id", userId).neq("id", tranne).limit(1)
    : per("licei_iscrizioni");
  const [profilo, iscrizioni, docenti, adesioni, commissariLicei, commissariUni, mentor, candidature] = await Promise.all([
    client.from("profiles").select("partnership_level").eq("id", userId).maybeSingle(),
    altreIscrizioni,
    per("licei_docenti"),
    per("licei_adesioni"),
    per("licei_commissari"),
    per("universita_commissari"),
    per("universita_mentor"),
    per("universita_candidature"),
  ]);
  const letture = [iscrizioni, docenti, adesioni, commissariLicei, commissariUni, mentor, candidature];
  const errore = [profilo.error, ...letture.map((r) => (r.error && !erroreSchemaMancante(r.error, "tabella") ? r.error : null))].find(Boolean);
  if (errore) {
    console.error("Licei: ruoli dell'account non verificati:", errore.message);
    return undefined;
  }
  const ce = (r: { data: unknown[] | null; error: unknown }) => !r.error && (r.data ?? []).length > 0;
  const livello = (profilo.data as { partnership_level?: string | null } | null)?.partnership_level ?? "";
  if (livello === "admin") return "staff";
  if (livello === "member" || livello === "partner") return "membro";
  if (ce(docenti) || ce(adesioni)) return "docente";
  if (ce(commissariLicei) || ce(commissariUni)) return "commissione";
  if (ce(mentor) || ce(candidature)) return "universita";
  if (ce(iscrizioni)) return "iscrizione";
  return null;
}

/**
 * L'account e nato con questa iscrizione? La rotta dell'iscrizione lo crea
 * pochi istanti prima della riga; un account esistente che il modulo ha
 * legato per email e nato prima, di solito molto prima. Dieci minuti di
 * margine, e mai dopo la riga oltre un minuto.
 */
function creatoDallIscrizione(accountCreatoAt: string | undefined, iscrizioneCreataAt: string | undefined): boolean {
  const a = Date.parse(accountCreatoAt ?? "");
  const i = Date.parse(iscrizioneCreataAt ?? "");
  if (!Number.isFinite(a) || !Number.isFinite(i)) return false;
  return a <= i + 60_000 && a >= i - 10 * 60_000;
}
