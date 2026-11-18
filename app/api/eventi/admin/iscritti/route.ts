import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import {
  caricaIscrizione,
  giornateAggiungibili,
  giornateMancantiNelDatabase,
  inviaBiglietto,
  postiPerGiornata,
  promuoviDaListaAttesa,
  type EsitoInvio,
  type IscrizioneEvento,
} from "@/lib/eventi/evento-server";
import { giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MANCA_RESEND =
  "Invio email non configurato: sul server manca RESEND_API_KEY. Avvisa la persona a mano o chiedi di configurare la chiave.";

/** L'esito dell'email, come lo legge il pannello. */
type EsitoEmail = { inviata: true; a: string } | { inviata: false; a: string; errore: string };

type Ponte = {
  id: string;
  registration_id: string;
  session_id: string;
  is_waitlist: boolean;
  slug: string;
  capienza_max: number | null;
};

async function leggiPonte(client: SupabaseClient, id: string): Promise<Ponte | null> {
  const { data, error } = await client
    .from("event_registration_sessions")
    .select("id, registration_id, session_id, is_waitlist, event_sessions ( slug, capienza_max )")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`event_registration_sessions: ${error.message}`);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (data as any).event_sessions;
  const sessione = Array.isArray(s) ? s[0] : s;
  return {
    id: String(data.id),
    registration_id: String(data.registration_id),
    session_id: String(data.session_id),
    is_waitlist: Boolean(data.is_waitlist),
    slug: String(sessione?.slug ?? ""),
    capienza_max: sessione?.capienza_max == null ? null : Number(sessione.capienza_max),
  };
}

async function mandaBiglietto(
  client: SupabaseClient,
  iscr: IscrizioneEvento,
  motivo: "reinvio" | "posto_liberato",
  giornataLiberata?: string,
): Promise<EsitoEmail> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { inviata: false, a: iscr.email, errore: MANCA_RESEND };
  // L'email invita anche alla giornata che la persona non ha, se ha posti.
  const posti = await postiPerGiornata(client);
  const esito = await inviaBiglietto(new Resend(key), iscr, motivo, {
    giornataLiberata,
    aggiungibili: giornateAggiungibili(iscr, posti),
  });
  if (esito.ok) return { inviata: true, a: iscr.email };
  console.error(`[eventi/admin/iscritti] email ${motivo} non partita:`, esito.errore);
  return { inviata: false, a: iscr.email, errore: `L'email non è partita (${esito.errore}).` };
}

/** "il 10 dicembre", "l'11 dicembre"; per una sessione sconosciuta, il suo codice. */
const conArticolo = (slug: string) => giornateConArticolo([slug]) || `la sessione "${slug || "senza nome"}"`;
const maiuscola = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

const errore = (messaggio: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: messaggio, ...extra }, { status });

/**
 * Le azioni dello staff su un'iscrizione, dal pannello:
 *
 * - `conferma` { bridge_id, forza? }: conferma il posto a chi è in lista
 *   d'attesa per una giornata e gli manda il biglietto aggiornato. Se la
 *   giornata è al completo risponde 409 con codice "pieno", e serve una
 *   seconda richiesta con `forza: true` (lo staff lo conferma a parole).
 * - `rimuovi_giornata` { bridge_id }: toglie la persona da quella giornata.
 *   Se era l'ultima, elimina sempre l'intera iscrizione (qualunque cosa mandi
 *   il client): un'iscrizione senza giornate non ha un biglietto valido.
 *   Se il posto era confermato e la giornata non è ancora conclusa, passa a
 *   chi è in lista d'attesa da più tempo (promuoviDaListaAttesa), che riceve
 *   il biglietto; la risposta dice a chi (`promossa`, solo il nome).
 * - `elimina_iscrizione` { registration_id }: elimina un'iscrizione rimasta
 *   senza giornate, ma non prima del file di ripristino.
 * - `reinvia` { registration_id }: rimanda il biglietto.
 *
 * Solo staff (requireAdmin). Ogni esito, email compresa, torna al pannello:
 * niente fallisce in silenzio.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errore("Richiesta non valida.", 400);
  }
  const azione = typeof body.azione === "string" ? body.azione : "";

  try {
    /* ── Conferma il posto dalla lista d'attesa ─────────────────────── */
    if (azione === "conferma") {
      const bridgeId = typeof body.bridge_id === "string" ? body.bridge_id : "";
      if (!UUID.test(bridgeId)) return errore("Parametri non validi.", 400);
      const forza = body.forza === true;

      const ponte = await leggiPonte(client, bridgeId);
      if (!ponte) return errore("Questa giornata non risulta più nell'iscrizione: aggiorna l'elenco.", 404);
      const art = conArticolo(ponte.slug);
      if (!sessionBySlug(ponte.slug)) {
        return errore(`La sessione "${ponte.slug}" non è una giornata del sito: non si può confermare da qui.`, 409);
      }
      if (!ponte.is_waitlist) {
        return NextResponse.json({ ok: true, gia: true, messaggio: `Il posto per ${art} era già confermato.` });
      }

      const { count, error: countError } = await client
        .from("event_registration_sessions")
        .select("id", { count: "exact", head: true })
        .eq("session_id", ponte.session_id)
        .eq("is_waitlist", false);
      if (countError) throw new Error(`conteggio confermati: ${countError.message}`);
      const confermati = count ?? 0;
      const capienza = ponte.capienza_max;
      if (capienza !== null && confermati >= capienza && !forza) {
        return errore(
          `${maiuscola(art)} è al completo: ${confermati} posti confermati su ${capienza}.`,
          409,
          { codice: "pieno", confermati, capienza },
        );
      }

      const { data: aggiornate, error: updError } = await client
        .from("event_registration_sessions")
        .update({ is_waitlist: false })
        .eq("id", ponte.id)
        .eq("is_waitlist", true)
        .select("id");
      if (updError) throw new Error(`conferma: ${updError.message}`);
      if (!aggiornate || aggiornate.length === 0) {
        // Qualcun altro l'ha confermata un attimo prima: nessuna seconda email.
        return NextResponse.json({ ok: true, gia: true, messaggio: `Il posto per ${art} era già confermato.` });
      }

      const iscr = await caricaIscrizione(client, { id: ponte.registration_id });
      if (!iscr) {
        return NextResponse.json({
          ok: true,
          messaggio: `Posto confermato per ${art}, ma non trovo più l'iscrizione per mandare l'email.`,
          email: null,
        });
      }
      const email = await mandaBiglietto(client, iscr, "posto_liberato", ponte.slug);
      const oltre = capienza !== null && confermati >= capienza;
      return NextResponse.json({
        ok: true,
        messaggio: oltre
          ? `Posto confermato per ${art}, oltre la capienza (${confermati + 1} su ${capienza}).`
          : `Posto confermato per ${art}.`,
        email,
      });
    }

    /* ── Rimuovi da una giornata ────────────────────────────────────── */
    if (azione === "rimuovi_giornata") {
      const bridgeId = typeof body.bridge_id === "string" ? body.bridge_id : "";
      if (!UUID.test(bridgeId)) return errore("Parametri non validi.", 400);
      // `elimina_iscrizione` non conta più: se è l'ultima giornata,
      // l'iscrizione si elimina sempre.

      const ponte = await leggiPonte(client, bridgeId);
      if (!ponte) return errore("Questa giornata non risulta più nell'iscrizione: aggiorna l'elenco.", 404);
      const art = conArticolo(ponte.slug);

      const { data: tolte, error: delError } = await client
        .from("event_registration_sessions")
        .delete()
        .eq("id", ponte.id)
        .select("id");
      if (delError) throw new Error(`rimozione giornata: ${delError.message}`);
      // Già tolta nel frattempo (dal biglietto online, da un altro pannello):
      // il posto l'ha già liberato e passato chi l'ha tolta, non si promuove due volte.
      const toltaOra = (tolte?.length ?? 0) > 0;

      // Subito dopo la cancellazione, prima di qualunque altra cosa che
      // possa fallire: il posto confermato passa a chi aspetta da più tempo,
      // che riceve il biglietto. Solo per le giornate del sito non ancora
      // concluse: dopo, l'email annuncerebbe un posto per una giornata
      // finita. Non lancia.
      const sessioneSito = sessionBySlug(ponte.slug);
      const giornataAperta = sessioneSito ? Date.parse(sessioneSito.fineISO) > Date.now() : false;
      let promossa: { nome: string; email: EsitoInvio | null } | null = null;
      if (!ponte.is_waitlist && giornataAperta && toltaOra) {
        const chiave = process.env.RESEND_API_KEY;
        const esito = await promuoviDaListaAttesa(client, chiave ? new Resend(chiave) : null, ponte.slug);
        if (esito) {
          const p = esito.iscrizione;
          promossa = { nome: `${p.nome} ${p.cognome}`.trim() || "una persona senza nome", email: esito.email };
        }
      }
      const promozione = promossa
        ? ` Posto passato a ${promossa.nome} dalla lista d'attesa. ${
            promossa.email === null
              ? "L'email non è partita perché sul server manca RESEND_API_KEY: avvisa la persona a mano."
              : promossa.email.ok
                ? "Il biglietto aggiornato è partito per email."
                : "Attenzione: l'email con il biglietto non è partita. Reinviala dalla sua scheda o avvisa la persona a mano."
          }`
        : "";
      // Al pannello solo il nome; se l'email della persona promossa non è
      // partita, il messaggio esce come avviso e non come semplice conferma.
      const promossaJson = promossa ? { nome: promossa.nome } : null;
      const emailPromozioneMancata = promossa !== null && promossa.email?.ok !== true;

      // Se il posto è rimasto libero e qualcuno aspetta ancora (per esempio
      // perché la giornata è oltre la capienza), lo staff lo sa subito.
      let inAttesa = 0;
      if (!ponte.is_waitlist && !promossa && giornataAperta) {
        const { count } = await client
          .from("event_registration_sessions")
          .select("id", { count: "exact", head: true })
          .eq("session_id", ponte.session_id)
          .eq("is_waitlist", true);
        inAttesa = count ?? 0;
      }
      const suggerimento =
        inAttesa > 0
          ? ` In lista d'attesa per ${art} ${inAttesa === 1 ? "c'è 1 persona" : `ci sono ${inAttesa} persone`}: se c'è posto, puoi ${inAttesa === 1 ? "confermarla" : "confermarle"} da qui.`
          : "";

      const { count: rimaste, error: restError } = await client
        .from("event_registration_sessions")
        .select("id", { count: "exact", head: true })
        .eq("registration_id", ponte.registration_id);
      if (restError) {
        console.error("[eventi/admin/iscritti] giornate rimaste:", restError.message);
        return NextResponse.json({
          ok: true,
          eliminata: false,
          attenzione: true,
          promossa: promossaJson,
          messaggio: `Tolta l'iscrizione per ${art}, ma non riesco a contare le giornate rimaste. Aggiorna l'elenco: se ora non ne ha nessuna, elimina l'iscrizione dalla sua scheda.${promozione}${suggerimento}`,
        });
      }

      if ((rimaste ?? 0) === 0) {
        // L'ultima giornata: l'iscrizione si elimina sempre.
        const { error: regError } = await client.from("event_registrations").delete().eq("id", ponte.registration_id);
        if (regError) {
          console.error("[eventi/admin/iscritti] eliminazione iscrizione:", regError.message);
          return NextResponse.json({
            ok: true,
            eliminata: false,
            attenzione: true,
            rimaste: 0,
            promossa: promossaJson,
            messaggio: `Giornata tolta, ma l'iscrizione non si è cancellata e ora non ha nessuna giornata. Aggiorna l'elenco ed eliminala dalla sua scheda.${promozione}${suggerimento}`,
          });
        }
        return NextResponse.json({
          ok: true,
          eliminata: true,
          rimaste: 0,
          attenzione: emailPromozioneMancata || undefined,
          promossa: promossaJson,
          messaggio: `Iscrizione eliminata: ${art} era la sua unica giornata.${promozione}${suggerimento}`,
        });
      }

      return NextResponse.json({
        ok: true,
        eliminata: false,
        rimaste: rimaste ?? 0,
        attenzione: emailPromozioneMancata || undefined,
        promossa: promossaJson,
        messaggio: `Tolta l'iscrizione per ${art}.${promozione}${suggerimento}`,
      });
    }

    /* ── Elimina un'iscrizione rimasta senza giornate ───────────────── */
    // Un'iscrizione senza nessuna giornata non ha un biglietto valido e non
    // riceve le email a tutti. Si può eliminare da qui, ma solo se davvero
    // non ha più nessuna giornata, e mai prima del file di ripristino: finché
    // manca una giornata nel database, quell'iscrizione può essere una di
    // quelle che il file riporta al 10 dicembre.
    if (azione === "elimina_iscrizione") {
      const registrationId = typeof body.registration_id === "string" ? body.registration_id : "";
      if (!UUID.test(registrationId)) return errore("Parametri non validi.", 400);
      if ((await giornateMancantiNelDatabase(client)).length > 0) {
        return errore(
          "Prima va eseguito il file di ripristino: questa iscrizione potrebbe riavere il 10 dicembre.",
          409,
          { codice: "ripristino_mancante" },
        );
      }
      const { count, error: countError } = await client
        .from("event_registration_sessions")
        .select("id", { count: "exact", head: true })
        .eq("registration_id", registrationId);
      if (countError) throw new Error(`giornate dell'iscrizione: ${countError.message}`);
      if ((count ?? 0) > 0) {
        return errore("Questa iscrizione ha ancora almeno una giornata: toglila prima, oppure aggiorna l'elenco.", 409);
      }
      const { error: delError } = await client.from("event_registrations").delete().eq("id", registrationId);
      if (delError) throw new Error(`eliminazione iscrizione: ${delError.message}`);
      return NextResponse.json({ ok: true, eliminata: true, messaggio: "Iscrizione senza giornate eliminata." });
    }

    /* ── Reinvia il biglietto ───────────────────────────────────────── */
    if (azione === "reinvia") {
      const registrationId = typeof body.registration_id === "string" ? body.registration_id : "";
      if (!UUID.test(registrationId)) return errore("Parametri non validi.", 400);

      const iscr = await caricaIscrizione(client, { id: registrationId });
      if (!iscr) return errore("Iscrizione non trovata: forse è stata eliminata. Aggiorna l'elenco.", 404);
      if (!iscr.giornate.some((g) => sessionBySlug(g.slug))) {
        return errore(
          "Questa iscrizione non ha nessuna giornata: il biglietto sarebbe vuoto. Prima aggiungi la giornata giusta dal biglietto, oppure elimina l'iscrizione.",
          409,
        );
      }
      if (!process.env.RESEND_API_KEY) return errore(MANCA_RESEND, 503);

      const email = await mandaBiglietto(client, iscr, "reinvio");
      if (!email.inviata) return errore(email.errore, 502);
      return NextResponse.json({ ok: true, messaggio: `Biglietto reinviato a ${email.a}.`, email });
    }

    return errore("Azione sconosciuta.", 400);
  } catch (err) {
    console.error(`[eventi/admin/iscritti] ${azione}:`, err instanceof Error ? err.message : err);
    return errore("Il database non ha risposto: l'operazione potrebbe non essere stata completata. Aggiorna l'elenco e controlla.", 500);
  }
}
