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

/** I posti per giornata dal database (event_seats_remaining). Vuoto se la lettura fallisce. */
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
  if (error || !data) return [];
  const presenti = new Set((data as { slug: string }[]).map((r) => r.slug));
  return SESSIONS.map((s) => s.slug as string).filter((slug) => !presenti.has(slug));
}

/**
 * Le giornate che una persona non ha e che hanno ancora posti: l'email la
 * invita a venire anche quel giorno.
 */
export function giornateAggiungibili(iscr: IscrizioneEvento, posti: PostiGiornata[]): string[] {
  const ha = new Set(iscr.giornate.map((g) => g.slug));
  return SESSIONS.filter((s) => !ha.has(s.slug))
    .filter((s) => (posti.find((p) => p.slug === s.slug)?.rimanenti ?? 0) > 0)
    .map((s) => s.slug);
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
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_MITTENTE,
      to: iscr.email,
      replyTo: EMAIL_RISPOSTE,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, errore: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}
