/**
 * Le candidature dei giudici dal link di invito: lo staff manda un link
 * (anche su WhatsApp), la persona compila nome, email, ruolo e
 * organizzazione, e lo staff approva o rifiuta con un clic. Nessuno entra in
 * Commissione senza quel clic: chi vota lo decide la Fondazione (art. 8).
 *
 * Senza migrazioni. La candidatura e una riga di `licei_commissari` con
 * `attivo = false`, e quindi senza accesso a niente (la guardia della
 * Commissione, le policy e lo smistamento guardano `attivo`). La segna come
 * candidatura, e non come giudice disattivato, la chiave
 * `giudice_richiesta_<id>` in `licei_config`: solo id, data e se l'account
 * e nato con la candidatura, niente di personale, perche la tabella e
 * leggibile da chiunque. Nome, email e organizzazione stanno dove stanno i
 * giudici, e l'organizzazione solo nell'email allo staff.
 *
 * Il link porta un codice, in `licei_config` (`commissione_invito_codice`):
 * senza il codice la pagina non accetta candidature, e lo staff lo puo
 * rigenerare quando vuole (il link vecchio smette di funzionare).
 *
 * Solo server.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { COMMISSIONE_PATH, RUOLI_COMMISSIONE, SITE_URL } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { ADESIONI_MENTOR_FINO } from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import { inviaAccesso } from "@/lib/eventi/licei-commissari";
import { INTESTAZIONE, chiusura, esc } from "@/lib/eventi/licei-email";
import { MITTENTE_AVVISI, RISPOSTE_AVVISI } from "@/lib/eventi/licei-avvisi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

const CHIAVE_CODICE = "commissione_invito_codice";
export const chiaveRichiesta = (commissarioId: string) => `giudice_richiesta_${commissarioId}`;
export const CANDIDATURA_SLUG = "candidatura";
export const CANDIDATURA_PATH = `${COMMISSIONE_PATH}/${CANDIDATURA_SLUG}`;

/** I ruoli che chi si candida puo indicare: non il consorzio, che e uno solo e lo indica lo staff. */
export const RUOLI_CANDIDATURA = RUOLI_COMMISSIONE.filter((r) => r.value !== "consorzio");

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const nuovoCodice = () => randomBytes(9).toString("base64url");

/** Il codice del link, creato alla prima richiesta dello staff. */
export async function codiceInvito(db: Db): Promise<string> {
  const { data } = await db.from("licei_config").select("valore").eq("chiave", CHIAVE_CODICE).maybeSingle();
  if (data?.valore) return String(data.valore);
  const codice = nuovoCodice();
  const ora = new Date().toISOString();
  const { error } = await db.from("licei_config").insert({ chiave: CHIAVE_CODICE, valore: codice, aggiornato_at: ora, aggiornato_by: null });
  if (error && error.code === "23505") {
    const { data: dopo } = await db.from("licei_config").select("valore").eq("chiave", CHIAVE_CODICE).maybeSingle();
    return String(dopo?.valore ?? codice);
  }
  if (error) throw new Error(`licei_config: ${error.message}`);
  return codice;
}

/** Un codice nuovo: il link di prima smette di funzionare. */
export async function rigeneraCodice(db: Db, autore: string | null): Promise<string> {
  const codice = nuovoCodice();
  const ora = new Date().toISOString();
  const { error } = await db
    .from("licei_config")
    .upsert({ chiave: CHIAVE_CODICE, valore: codice, aggiornato_at: ora, aggiornato_by: autore }, { onConflict: "chiave" });
  if (error) throw new Error(`licei_config: ${error.message}`);
  return codice;
}

export const linkInvito = (codice: string) => `${SITE_URL}${CANDIDATURA_PATH}?c=${encodeURIComponent(codice)}`;

/** Il codice del link e quello giusto? Confronto a tempo costante. */
export async function codiceValido(db: Db, c: string | null | undefined): Promise<boolean> {
  if (!c || c.length > 64) return false;
  const { data } = await db.from("licei_config").select("valore").eq("chiave", CHIAVE_CODICE).maybeSingle();
  const atteso = String(data?.valore ?? "");
  if (!atteso) return false;
  const a = Buffer.from(atteso), b = Buffer.from(c);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const candidatureAperte = (adesso: number = Date.now()) => adesso <= Date.parse(ADESIONI_MENTOR_FINO);

export type Candidatura = {
  codice: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string;
  organizzazione: string;
};

export type EsitoCandidatura =
  | { stato: "inviata" }
  | { stato: "gia_giudice" }
  | { stato: "gia_in_attesa" }
  | { stato: "errore"; errore: string; status: number };

const testo = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * La candidatura: account (quello che c'e, o uno nuovo), riga di
 * `licei_commissari` non attiva, chiave della richiesta, email a chi si
 * candida e allo staff.
 */
export async function inviaCandidatura(
  db: Db,
  input: Partial<Candidatura>,
  invio?: Pick<Resend, "emails">,
): Promise<EsitoCandidatura> {
  if (!candidatureAperte()) return { stato: "errore", errore: "Le candidature alla Commissione sono chiuse.", status: 409 };
  if (!(await codiceValido(db, input.codice))) {
    return { stato: "errore", errore: "Il link di invito non è valido o non è più attivo. Chieda un link nuovo alla Fondazione.", status: 403 };
  }
  const nome = testo(input.nome, 80);
  const cognome = testo(input.cognome, 80);
  const email = testo(input.email, 200).toLowerCase();
  const ruolo = testo(input.ruolo, 40);
  const organizzazione = testo(input.organizzazione, 160);
  if (!nome || !cognome) return { stato: "errore", errore: "Indichi nome e cognome.", status: 400 };
  if (!isEmail(email)) return { stato: "errore", errore: "L'indirizzo email non sembra valido.", status: 400 };
  if (!RUOLI_CANDIDATURA.some((r) => r.value === ruolo)) return { stato: "errore", errore: "Scelga il ruolo.", status: 400 };

  // Una candidatura o un giudice con questa email c'e gia? Si guarda anche
  // per email, non solo per account: un secondo invio dallo stesso modulo
  // non deve creare un secondo account.
  const { data: perEmail } = await db.from("licei_commissari").select("id, attivo").eq("email", email);
  for (const g of (perEmail ?? []) as { id: string; attivo: boolean }[]) {
    if (g.attivo) return { stato: "gia_giudice" };
    const { data: marca } = await db.from("licei_config").select("chiave").eq("chiave", chiaveRichiesta(g.id)).maybeSingle();
    if (marca) return { stato: "gia_in_attesa" };
  }

  // L'account: quello che c'e gia per questa email, o uno nuovo.
  let userId: string | null = null;
  let nuovo = false;
  const { data: profilo } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  userId = (profilo?.id as string | undefined) ?? null;

  if (userId) {
    const { data: esistente } = await db.from("licei_commissari").select("id, attivo").eq("user_id", userId).maybeSingle();
    if (esistente) {
      if (esistente.attivo) return { stato: "gia_giudice" };
      const { data: marca } = await db.from("licei_config").select("chiave").eq("chiave", chiaveRichiesta(esistente.id)).maybeSingle();
      if (marca) return { stato: "gia_in_attesa" };
      return { stato: "errore", errore: "Per questo indirizzo c'è già una posizione in Commissione non attiva: scriva a info@bioergotech.org.", status: 409 };
    }
  } else {
    const { data: creato, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${nome} ${cognome}` },
    });
    if (error || !creato.user) {
      console.error("Licei candidatura giudice: account non creato:", error);
      return { stato: "errore", errore: "Non è stato possibile registrare la candidatura. Riprovi fra poco.", status: 500 };
    }
    userId = creato.user.id;
    nuovo = true;
  }

  const voto = RUOLI_COMMISSIONE.find((r) => r.value === ruolo)?.voto ?? true;
  const { data: riga, error: errRiga } = await db
    .from("licei_commissari")
    .insert({ user_id: userId, nome, cognome, email, ruolo, diritto_voto: voto, attivo: false })
    .select("id")
    .maybeSingle();
  if (errRiga || !riga) {
    console.error("Licei candidatura giudice: riga non creata:", errRiga);
    return { stato: "errore", errore: "Non è stato possibile registrare la candidatura. Riprovi fra poco.", status: 500 };
  }
  const ora = new Date().toISOString();
  await db.from("licei_config").insert({
    chiave: chiaveRichiesta(riga.id as string),
    valore: JSON.stringify({ at: ora, nuovo }),
    aggiornato_at: ora,
    aggiornato_by: null,
  });

  const resend = invio ?? (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
  if (resend) {
    const ruoloLabel = RUOLI_COMMISSIONE.find((r) => r.value === ruolo)?.label ?? ruolo;
    try {
      await resend.emails.send({
        from: MITTENTE_AVVISI,
        to: email,
        replyTo: RISPOSTE_AVVISI,
        subject: "Commissione di valutazione: candidatura ricevuta",
        html: cornice(`
          <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Gentile ${esc(`${nome} ${cognome}`)},</h2>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 16px;">grazie: abbiamo ricevuto la sua disponibilità a far parte della Commissione di valutazione dei progetti delle scuole superiori.</p>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 16px;">La Fondazione la conferma a breve. Con la conferma le arriva un'email con l'accesso all'area della Commissione, il video di due minuti e la guida.</p>`),
      });
      await resend.emails.send({
        from: MITTENTE_AVVISI,
        to: RISPOSTE_AVVISI,
        subject: `[Commissione licei] Nuova candidatura: ${nome} ${cognome}`,
        html: cornice(`
          <h2 style="color:#0A1628;font-size:20px;margin:0 0 12px;font-weight:700;">Nuova candidatura a giudice</h2>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 6px;"><strong>${esc(`${nome} ${cognome}`)}</strong>, ${esc(email)}</p>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 6px;">Ruolo: ${esc(ruoloLabel)}</p>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 16px;">Organizzazione: ${esc(organizzazione || "non indicata")}</p>
          <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0;">Approva o rifiuta dal pannello dei licei, scheda «Commissione».</p>`),
      });
    } catch (err) {
      console.error("Licei candidatura giudice: email non partite:", err);
    }
  }
  return { stato: "inviata" };
}

const cornice = (corpo: string) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    ${INTESTAZIONE}
    <div style="padding:36px 40px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      ${corpo}
      ${chiusura()}
    </div>
  </div>`;

/** Le candidature in attesa: id della riga e quando e arrivata. */
export async function richiesteInAttesa(db: Db): Promise<Map<string, { at: string; nuovo: boolean }>> {
  const { data } = await db.from("licei_config").select("chiave, valore").like("chiave", "giudice_richiesta_%");
  const m = new Map<string, { at: string; nuovo: boolean }>();
  for (const r of (data ?? []) as { chiave: string; valore: string | null }[]) {
    try {
      const v = JSON.parse(r.valore ?? "{}") as { at?: string; nuovo?: boolean };
      m.set(r.chiave.replace("giudice_richiesta_", ""), { at: v.at ?? "", nuovo: !!v.nuovo });
    } catch {
      m.set(r.chiave.replace("giudice_richiesta_", ""), { at: "", nuovo: false });
    }
  }
  return m;
}

/** Approva: la persona entra in Commissione e riceve l'email di accesso. */
export async function approvaCandidatura(db: Db, id: string): Promise<{ ok: boolean; errore?: string; emailInviata?: boolean }> {
  const richieste = await richiesteInAttesa(db);
  const r = richieste.get(id);
  if (!r) return { ok: false, errore: "Candidatura non trovata o già gestita." };
  const { data: c, error } = await db
    .from("licei_commissari")
    .update({ attivo: true })
    .eq("id", id)
    .select("id, user_id, nome, cognome, email, ruolo, diritto_voto")
    .maybeSingle();
  if (error || !c) return { ok: false, errore: error?.message ?? "Candidatura non trovata." };
  await db.from("licei_config").delete().eq("chiave", chiaveRichiesta(id));
  const accesso = await inviaAccesso(db, {
    userId: c.user_id,
    email: c.email,
    nome: `${c.nome} ${c.cognome}`.trim(),
    ruolo: c.ruolo,
    diritto_voto: c.diritto_voto,
    nuovo: r.nuovo,
  });
  return { ok: true, emailInviata: accesso.inviata };
}

/**
 * Rifiuta: la riga si toglie, e l'account se era nato con la candidatura
 * (un account che esisteva gia, di un mentor o di un docente, resta).
 */
export async function rifiutaCandidatura(db: Db, id: string): Promise<{ ok: boolean; errore?: string }> {
  const richieste = await richiesteInAttesa(db);
  const r = richieste.get(id);
  if (!r) return { ok: false, errore: "Candidatura non trovata o già gestita." };
  const { data: c } = await db.from("licei_commissari").select("id, user_id, attivo").eq("id", id).maybeSingle();
  if (c && !c.attivo) {
    await db.from("licei_commissari").delete().eq("id", id);
    if (r.nuovo && c.user_id) {
      try {
        await db.auth.admin.deleteUser(c.user_id);
      } catch (err) {
        console.error("Licei candidatura giudice: account non tolto:", err);
      }
    }
  }
  await db.from("licei_config").delete().eq("chiave", chiaveRichiesta(id));
  return { ok: true };
}
