/**
 * Il lato server dell'iscrizione all'evento, condiviso da tutte le rotte che
 * leggono un iscritto o gli mandano il biglietto: l'iscrizione, il biglietto
 * online, il pannello, l'ingresso e le comunicazioni.
 *
 * Solo server: usa la service role.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import { SESSIONS, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import type { SessionStatus } from "@/lib/eventi/registration";
import { EMAIL_MITTENTE, EMAIL_RISPOSTE, emailBiglietto, type MotivoEmail } from "@/lib/eventi/email";

/** Il client con la service role, o null se la configurazione manca (build locali). */
export function eventoAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type StatoCheckin = "registrato" | "presente" | "assente";

/** Una giornata di un iscritto: la riga di event_registration_sessions. */
export type GiornataIscritto = {
  /** L'id della riga ponte, quello che serve al check-in. */
  id: string;
  slug: string;
  status: SessionStatus;
  stato_checkin: StatoCheckin;
  checkin_ts: string | null;
  /** Quando la giornata è stata aggiunta. */
  created_at: string | null;
};

export type IscrizioneEvento = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  categoria: string;
  organizzazione: string | null;
  classe: string | null;
  note: string | null;
  codice: string;
  created_at: string;
  /** Nell'ordine dell'evento; le giornate che il sito non conosce in fondo. */
  giornate: GiornataIscritto[];
};

export const SELECT_ISCRIZIONE = `id, nome, cognome, email, telefono, categoria, organizzazione, classe, note,
  codice_univoco, created_at,
  event_registration_sessions ( id, is_waitlist, stato_checkin, checkin_ts, created_at, event_sessions ( slug ) )`;

const ordine = (slug: string) => {
  const s = sessionBySlug(slug);
  return s ? s.giorno : 99;
};

/** Da una riga letta con SELECT_ISCRIZIONE alla forma comoda. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizzaIscrizione(r: any): IscrizioneEvento {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ponti = ((r.event_registration_sessions ?? []) as any[]).map((b) => ({
    id: String(b.id),
    slug: String(b.event_sessions?.slug ?? ""),
    status: (b.is_waitlist ? "lista_attesa" : "confermato") as SessionStatus,
    stato_checkin: (b.stato_checkin ?? "registrato") as StatoCheckin,
    checkin_ts: b.checkin_ts ?? null,
    created_at: b.created_at ?? null,
  }));
  ponti.sort((a, b) => ordine(a.slug) - ordine(b.slug));
  return {
    id: String(r.id),
    nome: r.nome ?? "",
    cognome: r.cognome ?? "",
    email: r.email ?? "",
    telefono: r.telefono ?? null,
    categoria: r.categoria ?? "",
    organizzazione: r.organizzazione ?? null,
    classe: r.classe ?? null,
    note: r.note ?? null,
    codice: r.codice_univoco ?? "",
    created_at: r.created_at ?? "",
    giornate: ponti,
  };
}

/** Il codice del biglietto pulito: solo lettere, numeri e trattini, in maiuscolo. */
export function pulisciCodice(v: string | null | undefined): string {
  return (v ?? "").replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 32);
}

/** Un iscritto per codice, id o email, con tutte le sue giornate. Null se non c'è. */
export async function caricaIscrizione(
  client: SupabaseClient,
  chiave: { codice: string } | { id: string } | { email: string },
): Promise<IscrizioneEvento | null> {
  let q = client.from("event_registrations").select(SELECT_ISCRIZIONE);
  if ("codice" in chiave) {
    const c = pulisciCodice(chiave.codice);
    if (!c) return null;
    q = q.eq("codice_univoco", c);
  } else if ("id" in chiave) {
    q = q.eq("id", chiave.id);
  } else {
    // L'RPC salva l'email in minuscolo e senza spazi: lo stesso confronto qui.
    q = q.eq("email", chiave.email.trim().toLowerCase());
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`event_registrations: ${error.message}`);
  return data ? normalizzaIscrizione(data) : null;
}

export type PostiGiornata = { slug: string; capienza_max: number; confermati: number; rimanenti: number };

/**
 * I posti per giornata dal database (event_seats_remaining). Vuoto se la
 * lettura fallisce: serve solo agli inviti "vieni anche il..." e ai numeri
 * mostrati, mai a decidere un'iscrizione (quella la decide l'RPC).
 */
export async function postiPerGiornata(client: SupabaseClient): Promise<PostiGiornata[]> {
  const { data, error } = await client.rpc("event_seats_remaining");
  if (error || !Array.isArray(data)) return [];
  return (data as PostiGiornata[]).map((p) => ({
    slug: String(p.slug),
    capienza_max: Number(p.capienza_max),
    confermati: Number(p.confermati),
    rimanenti: Number(p.rimanenti),
  }));
}

/**
 * Le giornate del sito che mancano nel database. Deve essere vuoto: se non
 * lo è, chi sceglie quella giornata non viene iscritto (è il guasto del
 * novembre 2026). Il pannello lo mostra in rosso e l'iscrizione si ferma.
 */
export async function giornateMancantiNelDatabase(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("event_sessions").select("slug");
  // Una lettura fallita non vuol dire "non manca niente": si lancia, e chi
  // chiama si ferma invece di andare avanti alla cieca.
  if (error || !data) throw new Error(`event_sessions: ${error?.message ?? "nessun dato"}`);
  const presenti = new Set((data as { slug: string }[]).map((r) => r.slug));
  return SESSIONS.map((s) => s.slug as string).filter((slug) => !presenti.has(slug));
}

/**
 * Le giornate che una persona non ha, che non sono ancora iniziate e che
 * hanno ancora posti: l'email la invita a venire anche quel giorno. Una
 * giornata già iniziata non si offre più: il link porterebbe a "non si può
 * più aggiungere".
 */
export function giornateAggiungibili(
  iscr: IscrizioneEvento,
  posti: PostiGiornata[],
  adesso: number = Date.now(),
): string[] {
  const ha = new Set(iscr.giornate.map((g) => g.slug));
  return SESSIONS.filter((s) => !ha.has(s.slug))
    .filter((s) => Date.parse(s.inizioISO) > adesso)
    .filter((s) => (posti.find((p) => p.slug === s.slug)?.rimanenti ?? 0) > 0)
    .map((s) => s.slug);
}

/**
 * Dopo che un posto confermato si è liberato: conferma la persona che è in
 * lista d'attesa da più tempo per quella giornata, se c'è ancora posto, e
 * le manda il biglietto ("si è liberato un posto"). Così è vero quello che
 * dicono le pagine e le email: il posto passa a chi è in lista d'attesa,
 * prima che lo prenda un nuovo iscritto.
 *
 * Non lancia mai: chi ha liberato il posto non deve vedere un errore per
 * questo. Ogni problema finisce nei log, e il pannello mostra comunque
 * "Puoi confermare N persone" finché il posto resta libero.
 *
 * Non c'è il lock dell'RPC: se nello stesso istante si iscrive qualcuno, la
 * giornata può superare la capienza di un posto, mai di più. L'update vale
 * solo se la riga è ancora in lista d'attesa, quindi due liberazioni
 * contemporanee non confermano due volte la stessa persona.
 *
 * Torna l'iscrizione confermata, o null se nessuno è stato confermato.
 */
export async function promuoviDaListaAttesa(
  client: SupabaseClient,
  resend: Resend | null,
  slug: string,
): Promise<IscrizioneEvento | null> {
  try {
    const { data: sess, error: sessError } = await client
      .from("event_sessions")
      .select("id, capienza_max")
      .eq("slug", slug)
      .maybeSingle();
    if (sessError || !sess) {
      if (sessError) console.error(`Lista d'attesa ${slug}: giornata non letta:`, sessError.message);
      return null;
    }

    const { count, error: countError } = await client
      .from("event_registration_sessions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sess.id)
      .eq("is_waitlist", false);
    if (countError) {
      console.error(`Lista d'attesa ${slug}: confermati non contati:`, countError.message);
      return null;
    }
    if ((count ?? 0) >= Number(sess.capienza_max)) return null;

    const { data: primo, error: primoError } = await client
      .from("event_registration_sessions")
      .select("id, registration_id")
      .eq("session_id", sess.id)
      .eq("is_waitlist", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (primoError) {
      console.error(`Lista d'attesa ${slug}: primo in attesa non letto:`, primoError.message);
      return null;
    }
    if (!primo) return null;

    const { data: aggiornate, error: updError } = await client
      .from("event_registration_sessions")
      .update({ is_waitlist: false })
      .eq("id", primo.id)
      .eq("is_waitlist", true)
      .select("id");
    if (updError) {
      console.error(`Lista d'attesa ${slug}: conferma non riuscita:`, updError.message);
      return null;
    }
    if (!aggiornate || aggiornate.length === 0) return null; // confermata nel frattempo da qualcun altro

    console.info(`Lista d'attesa ${slug}: confermata l'iscrizione ${primo.registration_id} (posto liberato).`);
    const promossa = await caricaIscrizione(client, { id: String(primo.registration_id) });
    if (!promossa) return null;

    if (resend) {
      const posti = await postiPerGiornata(client);
      const esito = await inviaBiglietto(resend, promossa, "posto_liberato", {
        giornataLiberata: slug,
        aggiungibili: giornateAggiungibili(promossa, posti),
      });
      if (!esito.ok) {
        console.error(`Lista d'attesa ${slug}: biglietto non inviato all'iscrizione ${promossa.id}:`, esito.errore);
      }
    } else {
      console.error(`Lista d'attesa ${slug}: RESEND_API_KEY mancante, biglietto non inviato all'iscrizione ${promossa.id}.`);
    }
    return promossa;
  } catch (err) {
    console.error(`Lista d'attesa ${slug}: errore inatteso:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export type EsitoInvio = { ok: true; id: string | null } | { ok: false; errore: string };

/**
 * Manda il biglietto a un iscritto. Non lancia: torna l'esito, così chi
 * chiama decide che cosa dire. Resend non lancia sugli errori 4xx e 5xx,
 * torna `{ error }`: lo si legge qui, una volta per tutti.
 */
export async function inviaBiglietto(
  resend: Resend,
  iscr: IscrizioneEvento,
  motivo: MotivoEmail,
  opzioni: { giornataLiberata?: string; nuovoAccount?: boolean; aggiungibili?: string[] } = {},
): Promise<EsitoInvio> {
  const giornate = iscr.giornate.filter((g) => sessionBySlug(g.slug)).map((g) => ({ slug: g.slug, status: g.status }));
  const { subject, html, text } = emailBiglietto({
    nome: iscr.nome,
    codice: iscr.codice,
    giornate,
    motivo,
    ...opzioni,
  });
  const messaggio = { from: EMAIL_MITTENTE, to: iscr.email, replyTo: EMAIL_RISPOSTE, subject, html, text };
  return inviaConUnNuovoTentativo(() => resend.emails.send(messaggio));
}

/** Gli errori di Resend per cui ha senso riprovare: troppe richieste, server, rete. */
function erroreTemporaneo(e: { name?: string; statusCode?: number | null }): boolean {
  if (e.name === "rate_limit_exceeded" || e.name === "internal_server_error" || e.name === "application_error") return true;
  return e.statusCode == null || e.statusCode === 429 || e.statusCode >= 500;
}

/**
 * Un invio con un secondo tentativo dopo un secondo, solo per gli errori
 * temporanei: una classe che si iscrive dallo stesso QR nello stesso minuto
 * può superare per un attimo il limite di Resend. Le quote esaurite e gli
 * indirizzi rifiutati non si riprovano.
 */
export async function inviaConUnNuovoTentativo(
  invia: () => Promise<{ data: { id: string } | null; error: { name?: string; message: string; statusCode?: number | null } | null }>,
): Promise<EsitoInvio> {
  let ultimo = "";
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    if (tentativo > 0) await new Promise((r) => setTimeout(r, 1000));
    try {
      const { data, error } = await invia();
      if (!error) return { ok: true, id: data?.id ?? null };
      ultimo = `${error.name}: ${error.message}`;
      if (!erroreTemporaneo(error)) break;
    } catch (err) {
      ultimo = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, errore: ultimo };
}
