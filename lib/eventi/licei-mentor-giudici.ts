/**
 * I mentor del percorso come giudici della Commissione dei licei (l'art. 8
 * ci mette "i mentor coinvolti nel percorso").
 *
 * Il cron manda a ogni mentor approvato un'email con il pulsante "Si,
 * partecipo come giudice". Il pulsante porta a una pagina del sito con un
 * link firmato: niente accesso da fare, un clic di conferma, e il mentor
 * entra in Commissione con il ruolo "Impresa e mentor" e riceve l'email per
 * accedere all'area. Lo staff non raccoglie risposte e non inserisce
 * nessuno a mano.
 *
 * Il link e la firma HMAC dell'id del mentor, con una chiave derivata dalla
 * chiave di servizio di Supabase (che resta sul server): chi lo riceve puo
 * solo far entrare in Commissione quel mentor, con la sua email. Solo
 * server.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMISSIONE_PATH, SITE_URL } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { ADESIONI_MENTOR_FINO, DIVENTA_GIUDICE_SLUG } from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import { aggiungiCommissario } from "@/lib/eventi/licei-commissari";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

const chiave = (): Buffer | null => {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) return null;
  // Una chiave solo per questo uso, derivata: la chiave di servizio non
  // compare mai, e una firma per i mentor non vale per nient'altro.
  return createHash("sha256").update(`licei-mentor-giudice:v1:${base}`).digest();
};

const b64 = (b: Buffer) => b.toString("base64url");

export function firmaMentor(id: string): string | null {
  const k = chiave();
  if (!k) return null;
  return `${b64(Buffer.from(id))}.${b64(createHmac("sha256", k).update(id).digest())}`;
}

export function leggiFirmaMentor(token: string | null | undefined): string | null {
  const k = chiave();
  if (!k || !token || token.length > 300) return null;
  const [parte, firma] = token.split(".");
  if (!parte || !firma) return null;
  let id: string;
  try {
    id = Buffer.from(parte, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!/^[0-9a-f-]{8,64}$/i.test(id)) return null;
  const attesa = createHmac("sha256", k).update(id).digest();
  const data = Buffer.from(firma, "base64url");
  if (data.length !== attesa.length || !timingSafeEqual(data, attesa)) return null;
  return id;
}

export const DIVENTA_GIUDICE_PATH = `${COMMISSIONE_PATH}/${DIVENTA_GIUDICE_SLUG}`;

export function linkDiventaGiudice(id: string): string | null {
  const t = firmaMentor(id);
  return t ? `${SITE_URL}${DIVENTA_GIUDICE_PATH}?t=${encodeURIComponent(t)}` : null;
}

export const adesioniMentorAperte = (adesso: number = Date.now()): boolean => adesso <= Date.parse(ADESIONI_MENTOR_FINO);

export type MentorInvitabile = { id: string; user_id: string | null; nome: string; cognome: string; email: string };

/** I mentor approvati, e quali sono gia in Commissione (per account o per email). */
export async function mentorEGiudici(db: Db): Promise<{
  mentor: MentorInvitabile[];
  giudici: { user_id: string; email: string; attivo: boolean }[];
}> {
  const { data: mentor, error } = await db
    .from("universita_mentor")
    .select("id, user_id, nome, cognome, email")
    .eq("stato", "approvata")
    .order("cognome", { ascending: true });
  if (error) {
    if (erroreSchemaMancante(error)) return { mentor: [], giudici: [] };
    throw new Error(`universita_mentor: ${error.message}`);
  }
  const { data: giudici, error: e2 } = await db.from("licei_commissari").select("user_id, email, attivo");
  if (e2) throw new Error(`licei_commissari: ${e2.message}`);
  return {
    mentor: (mentor ?? []) as MentorInvitabile[],
    giudici: (giudici ?? []) as { user_id: string; email: string; attivo: boolean }[],
  };
}

const giaGiudice = <G extends { user_id: string; email: string }>(m: MentorInvitabile, giudici: G[]): G | null =>
  giudici.find(
    (g) => (m.user_id && g.user_id === m.user_id) || (g.email ?? "").trim().toLowerCase() === m.email.trim().toLowerCase(),
  ) ?? null;

/** I mentor approvati che non sono ancora in Commissione: a loro va l'invito. */
export async function mentorDaInvitare(db: Db): Promise<MentorInvitabile[]> {
  const { mentor, giudici } = await mentorEGiudici(db);
  return mentor.filter((m) => !giaGiudice(m, giudici));
}

export type StatoInvito =
  | { stato: "non_valido" }
  | { stato: "chiuso"; nome: string }
  | { stato: "gia_giudice"; nome: string }
  | { stato: "disattivato"; nome: string }
  | { stato: "da_confermare"; nome: string };

async function trova(db: Db, token: string | null | undefined) {
  const id = leggiFirmaMentor(token);
  if (!id) return null;
  const { data, error } = await db
    .from("universita_mentor")
    .select("id, user_id, nome, cognome, email, stato")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`universita_mentor: ${error.message}`);
  if (!data || data.stato !== "approvata") return null;
  return data as MentorInvitabile & { stato: string };
}

export async function statoInvito(db: Db, token: string | null | undefined): Promise<StatoInvito> {
  const m = await trova(db, token);
  if (!m) return { stato: "non_valido" };
  const { giudici } = await mentorEGiudici(db);
  const g = giaGiudice(m, giudici);
  if (g) return { stato: g.attivo ? "gia_giudice" : "disattivato", nome: m.nome };
  if (!adesioniMentorAperte()) return { stato: "chiuso", nome: m.nome };
  return { stato: "da_confermare", nome: m.nome };
}

/** "mario.rossi@x.it" diventa "ma***@x.it": la pagina e aperta a chi ha il link. */
export const mascheraEmail = (e: string): string => {
  const [nome, dominio] = e.split("@");
  if (!dominio) return "";
  return `${nome.slice(0, 2)}***@${dominio}`;
};

/** Il clic di conferma: il mentor entra in Commissione e riceve l'email di accesso. */
export async function accettaInvito(
  db: Db,
  token: string | null | undefined,
): Promise<
  | StatoInvito
  | { stato: "entrato"; nome: string; emailInviata: boolean; loginEmail: string; giaEntrato: boolean }
  | { stato: "errore"; errore: string }
> {
  const prima = await statoInvito(db, token);
  if (prima.stato !== "da_confermare") return prima;
  const m = (await trova(db, token))!;
  const esito = await aggiungiCommissario(db, {
    nome: m.nome,
    cognome: m.cognome,
    email: m.email,
    ruolo: "impresa",
    userId: m.user_id,
  });
  if (!esito.ok) return { stato: "errore", errore: esito.errore };
  return {
    stato: "entrato",
    nome: m.nome,
    emailInviata: esito.emailInviata,
    loginEmail: mascheraEmail(esito.loginEmail),
    giaEntrato: esito.giaEntrato,
  };
}
