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
  | { ok: true; commissario: Record<string, unknown>; emailInviata: boolean; loginEmail: string; giaEntrato: boolean }
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
  let nuovoAccount = false;

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
    nuovoAccount = true;
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

  const accesso = await inviaAccesso(client, {
    userId,
    email,
    nome,
    ruolo,
    diritto_voto,
    nuovo: nuovoAccount,
  });

  return {
    ok: true,
    commissario: (data ?? {}) as Record<string, unknown>,
    emailInviata: accesso.inviata,
    loginEmail: accesso.loginEmail,
    giaEntrato: accesso.giaEntrato,
  };
}

/**
 * L'email di accesso alla Commissione. Due casi:
 *  - l'account e gia stato usato (`last_sign_in_at`): la persona conosce la
 *    sua password, e l'email dice solo di accedere con le credenziali di
 *    sempre, con un link alla pagina per sceglierne una nuova se non la ricorda;
 *  - l'account e nuovo, o non e mai entrato (un mentor creato dallo staff
 *    che non ha usato il link dell'approvazione): l'email porta il link per
 *    scegliere la password.
 * `forzaLink` (il "Rimanda l'accesso" dello staff, per chi dice di non
 * riuscire a entrare) aggiunge il link anche nel primo caso, come
 * alternativa. Il link apre l'account di accesso, che per un mentor puo
 * avere un indirizzo diverso da quello a cui scriviamo: l'email lo dice.
 *
 * Torna se l'email e partita davvero: Resend un rifiuto lo restituisce, non
 * lo solleva, e prima andava perso.
 */
export async function inviaAccesso(
  client: Db,
  c: { userId: string; email: string; nome: string; ruolo: string | null; diritto_voto: boolean; nuovo?: boolean },
  invio?: Pick<Resend, "emails">,
  opzioni: { forzaLink?: boolean; promemoria?: boolean } = {},
): Promise<{ inviata: boolean; loginEmail: string; giaEntrato: boolean }> {
  let loginEmail = c.email;
  let giaEntrato = false;
  try {
    const { data } = await client.auth.admin.getUserById(c.userId);
    if (data?.user?.email) loginEmail = data.user.email;
    giaEntrato = !c.nuovo && !!data?.user?.last_sign_in_at;
  } catch (err) {
    console.error("Licei commissario: account non letto:", err);
  }

  let setPasswordUrl: string | undefined;
  if (!giaEntrato || opzioni.forzaLink) try {
    const { data: link, error } = await client.auth.admin.generateLink({
      type: "recovery",
      email: loginEmail,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    if (error) console.error("Licei commissario: link per la password non creato:", error.message);
    setPasswordUrl = link?.properties?.action_link;
  } catch (err) {
    console.error("Licei commissario: link per la password non creato:", err);
  }

  const resend = invio ?? (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
  if (!resend) return { inviata: false, loginEmail, giaEntrato };
  try {
    const { error } = await resend.emails.send({
      from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
      to: c.email,
      replyTo: "info@bioergotech.org",
      subject: commissarioEmailSubject(!!opzioni.promemoria),
      html: commissarioEmailHtml({
        nome: c.nome,
        ruolo: c.ruolo ?? "",
        diritto_voto: c.diritto_voto,
        setPasswordUrl,
        loginEmail: loginEmail.toLowerCase() !== c.email.toLowerCase() ? loginEmail : undefined,
        nuovo: !!c.nuovo,
        giaEntrato,
        promemoria: !!opzioni.promemoria,
      }),
    });
    if (error) {
      console.error("Licei commissario: email di accesso non partita:", error.message);
      return { inviata: false, loginEmail, giaEntrato };
    }
    return { inviata: true, loginEmail, giaEntrato };
  } catch (err) {
    console.error("Licei commissario: email di accesso non partita:", err);
    return { inviata: false, loginEmail, giaEntrato };
  }
}

/* ── Chi e entrato nell'area ─────────────────────────────────────────── */

/**
 * La chiave in `licei_config` che l'area della Commissione scrive alla prima
 * visita di un giudice. Contiene solo l'id e la data: la tabella e leggibile
 * da chiunque, e non ci finisce niente di personale.
 */
export const chiaveVisto = (commissarioId: string) => `giudice_visto_${commissarioId}`;
/** La chiave del promemoria a chi non e ancora entrato: parte una volta sola. */
export const chiavePromemoriaAccesso = (commissarioId: string) => `giudice_promemoria_${commissarioId}`;

/** Segna la prima visita all'area. Torna true se e la prima. */
export async function segnaVisto(client: Db, commissarioId: string): Promise<boolean> {
  const ora = new Date().toISOString();
  const { error } = await client
    .from("licei_config")
    .insert({ chiave: chiaveVisto(commissarioId), valore: ora, aggiornato_at: ora, aggiornato_by: null });
  if (!error) return true;
  if (error.code !== "23505") console.error("Licei commissione: prima visita non registrata:", error.message);
  return false;
}

export type AccessoGiudice = {
  /** E entrato nell'area della Commissione (o ci ha gia lavorato). */
  entrato: boolean;
  /** Quando, se lo sappiamo. */
  quando: string | null;
  /** Il promemoria di accesso e gia partito: quando. */
  promemoria_at: string | null;
};

/**
 * Chi e entrato nell'area, per lo staff e per il promemoria. E entrato chi
 * l'ha aperta (la chiave della prima visita), chi ha scelto i temi o
 * salvato una scheda (prima che la chiave esistesse), e chi ha fatto
 * l'accesso al sito dopo essere entrato in Commissione.
 */
export async function accessiGiudici(
  client: Db,
  giudici: { id: string; user_id: string; created_at?: string | null; temi?: unknown }[],
): Promise<Map<string, AccessoGiudice>> {
  const esito = new Map<string, AccessoGiudice>();
  if (giudici.length === 0) return esito;
  const [{ data: chiavi }, { data: schede }] = await Promise.all([
    client.from("licei_config").select("chiave, valore").like("chiave", "giudice_%"),
    client.from("licei_valutazioni").select("commissario_id"),
  ]);
  const valore = new Map(((chiavi ?? []) as { chiave: string; valore: string | null }[]).map((r) => [r.chiave, r.valore ?? ""]));
  const conSchede = new Set(((schede ?? []) as { commissario_id: string }[]).map((r) => r.commissario_id));
  for (const g of giudici) {
    const visto = valore.get(chiaveVisto(g.id)) || null;
    const promemoria_at = valore.get(chiavePromemoriaAccesso(g.id)) || null;
    let entrato = !!visto || conSchede.has(g.id) || (Array.isArray(g.temi) && g.temi.length > 0);
    let quando = visto;
    if (!entrato) {
      try {
        const { data } = await client.auth.admin.getUserById(g.user_id);
        const ultimo = data?.user?.last_sign_in_at ?? null;
        if (ultimo && (!g.created_at || Date.parse(ultimo) >= Date.parse(g.created_at))) {
          entrato = true;
          quando = ultimo;
        }
      } catch (err) {
        console.error("Licei commissione: accesso non letto:", err);
      }
    }
    esito.set(g.id, { entrato, quando, promemoria_at });
  }
  return esito;
}

/** Quanto deve passare dall'ingresso in Commissione prima del promemoria. */
const ATTESA_PROMEMORIA_MS = 20 * 60 * 60 * 1000;

/**
 * Il promemoria a chi e in Commissione da almeno 20 ore e non e ancora
 * entrato nell'area: la stessa email di accesso, con l'apertura "le
 * riscriviamo perche non risulta ancora entrato". Una volta per giudice
 * (la chiave si scrive prima di mandare, e si toglie se l'email non parte).
 * Lo esegue il cron ogni mattina.
 */
export async function promemoriaAccessoGiudici(
  client: Db,
  adesso: Date = new Date(),
  invio?: Pick<Resend, "emails">,
): Promise<{ inviati: number; falliti: number }> {
  const { data: righe, error } = await client
    .from("licei_commissari")
    .select("id, user_id, nome, cognome, email, ruolo, diritto_voto, attivo, created_at, temi");
  if (error) throw new Error(`licei_commissari: ${error.message}`);
  const attivi = ((righe ?? []) as {
    id: string; user_id: string; nome: string; cognome: string; email: string;
    ruolo: string | null; diritto_voto: boolean; attivo: boolean; created_at: string | null; temi?: unknown;
  }[]).filter((g) => g.attivo && g.created_at && adesso.getTime() - Date.parse(g.created_at) >= ATTESA_PROMEMORIA_MS);
  const accessi = await accessiGiudici(client, attivi);

  let inviati = 0;
  let falliti = 0;
  for (const g of attivi) {
    const a = accessi.get(g.id);
    if (!a || a.entrato || a.promemoria_at) continue;
    const ora = new Date().toISOString();
    const { error: prenota } = await client
      .from("licei_config")
      .insert({ chiave: chiavePromemoriaAccesso(g.id), valore: ora, aggiornato_at: ora, aggiornato_by: null });
    if (prenota) continue;
    const r = await inviaAccesso(
      client,
      { userId: g.user_id, email: g.email, nome: `${g.nome} ${g.cognome}`.trim(), ruolo: g.ruolo, diritto_voto: g.diritto_voto },
      invio,
      { promemoria: true },
    );
    if (r.inviata) inviati += 1;
    else {
      falliti += 1;
      await client.from("licei_config").delete().eq("chiave", chiavePromemoriaAccesso(g.id)).eq("valore", ora);
    }
  }
  return { inviati, falliti };
}
