/**
 * Aggiungere qualcuno alla Commissione dei licei: account, riga in
 * `licei_commissari`, email di invito. Una funzione sola per le due strade:
 * lo staff dal pannello, e il mentor che dall'email di invito risponde
 * "Si, partecipo come giudice". Solo server.
 *
 * L'account si crea qui se non c'e: chiedere a un professionista di
 * registrarsi da solo per poi cercare la pagina giusta e un modo
 * affidabile di non ricevere le sue schede. Chi ha gia un account (un
 * mentor, per esempio) entra con quello.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { commissarioEmailHtml, commissarioEmailSubject } from "@/lib/eventi/licei-email";
import { RUOLI_COMMISSIONE, SITE_URL } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

const RUOLI_VALIDI = new Set<string>(RUOLI_COMMISSIONE.map((r) => r.value));
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export type NuovoCommissario = {
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  diritto_voto?: boolean;
  /** L'account da usare, se gia noto (il mentor ne ha uno). */
  userId?: string | null;
};

export type EsitoCommissario =
  | { ok: true; commissario: Record<string, unknown> }
  | { ok: false; errore: string; status: number };

export async function aggiungiCommissario(client: Db, input: NuovoCommissario): Promise<EsitoCommissario> {
  const nome = input.nome.trim();
  const cognome = input.cognome.trim();
  const email = input.email.trim().toLowerCase();
  const ruolo = input.ruolo.trim();

  if (!nome) return { ok: false, errore: "Indica il nome.", status: 400 };
  if (!cognome) return { ok: false, errore: "Indica il cognome.", status: 400 };
  if (!isEmail(email)) return { ok: false, errore: "Email non valida.", status: 400 };
  if (ruolo && !RUOLI_VALIDI.has(ruolo)) return { ok: false, errore: "Ruolo non previsto dall'art. 8.", status: 400 };

  // Il diritto di voto segue il ruolo, salvo indicazione contraria: l'art. 8
  // lo nega al solo referente del consorzio, e lasciare la scelta libera
  // significherebbe poterlo dimenticare.
  const dirittoDaRuolo = RUOLI_COMMISSIONE.find((r) => r.value === ruolo)?.voto ?? true;
  const diritto_voto = input.diritto_voto === undefined ? dirittoDaRuolo : !!input.diritto_voto;

  /* ── Account ── */
  let userId: string | null = input.userId ?? null;
  let setPasswordUrl: string | undefined;

  if (!userId) {
    const { data: profilo } = await client.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = (profilo?.id as string | undefined) ?? null;
  }

  if (!userId) {
    const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${nome} ${cognome}` },
    });
    if (erroreCreazione || !creato.user) {
      console.error("Licei commissario createUser error:", erroreCreazione);
      return { ok: false, errore: "Non è stato possibile creare l'account del commissario.", status: 500 };
    }
    userId = creato.user.id;

    const { data: link } = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    setPasswordUrl = link?.properties?.action_link;
  }

  const { data, error } = await client
    .from("licei_commissari")
    .upsert(
      { user_id: userId, nome, cognome, email, ruolo: ruolo || null, diritto_voto, attivo: true },
      { onConflict: "user_id" },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("Licei commissario upsert error:", error);
    return { ok: false, errore: error.message, status: 500 };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: email,
        subject: commissarioEmailSubject(),
        html: commissarioEmailHtml({ nome, ruolo, diritto_voto, setPasswordUrl }),
      });
    } catch (mailErr) {
      console.error("Licei commissario email failed:", mailErr);
    }
  }

  return { ok: true, commissario: (data ?? {}) as Record<string, unknown> };
}
