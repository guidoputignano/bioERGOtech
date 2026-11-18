import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import {
  generateCodice,
  normalizzaNome,
  validaIscrizione,
  type RegistrationResult,
  type SessionStatus,
} from "@/lib/eventi/registration";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  caricaIscrizione,
  eventoAdminClient,
  giornateAggiungibili,
  giornateMancantiNelDatabase,
  inviaBiglietto,
  postiPerGiornata,
  type IscrizioneEvento,
} from "@/lib/eventi/evento-server";
import {
  ARCHIVE_MODE,
  CONSENSO_MARKETING_TESTO,
  SESSIONS,
  giornateConArticolo,
} from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/registrations: l'iscrizione all'evento dal modulo.
 *
 * Risposta 200:
 *   { success: true, codice, sessions, nuove, nuovoAccount, emailInviata }
 *   - sessions: TUTTE le giornate che la persona ha adesso (solo quelle che
 *     il sito conosce, nell'ordine dell'evento), non solo quelle di oggi;
 *   - nuove: le giornate aggiunte da questa richiesta;
 *   - nuovoAccount: l'account del Member Portal è stato appena creato;
 *   - emailInviata: il biglietto è partito (informativo: l'iscrizione vale
 *     comunque).
 * Errori: { error, campo? }, con campo fra nome, cognome, email, categoria,
 * sessioni, startup_name, consenso_privacy. Stati 400, 403 (iscrizioni
 * chiuse), 409, 503, 500.
 *
 * Due regole che contano più di tutte:
 * - nessuna giornata si perde in silenzio. Se una giornata manca nel
 *   database ci si ferma prima di scrivere (503); se l'RPC non la
 *   restituisce si risponde con un errore e non parte nessuna email;
 * - un'email appartiene a una persona. Chi si reiscrive con la stessa email
 *   e lo stesso nome riceve di nuovo il biglietto, con le giornate in più;
 *   un nome diverso si ferma (409), senza dire di chi è l'email.
 */

const ERRORE_GENERICO =
  "Non siamo riusciti a completare l'iscrizione. Riprova tra qualche istante. Se il problema continua, scrivi a info@bioergotech.org.";

type CorpoErrore = { error: string; campo?: string };

const errore = (status: number, error: string, campo?: string) =>
  NextResponse.json<CorpoErrore>(campo ? { error, campo } : { error }, { status });

/** Le giornate del sito, nell'ordine dell'evento. */
const ordineEvento = (slugs: Iterable<string>): string[] => {
  const set = new Set(slugs);
  return SESSIONS.filter((s) => set.has(s.slug)).map((s) => s.slug);
};

/** Un campo facoltativo di testo, pulito e accorciato: mai un motivo per rifiutare un'iscrizione. */
const facoltativo = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
};

/** Il messaggio per un refuso nel dominio dell'email, o null. */
function erroreRefuso(email: string, confermata: boolean): string | null {
  const r = refusoEmail(email);
  if (!r) return null;
  if (r.impossibile) {
    return r.suggerimento
      ? `L'indirizzo email finisce con «${r.dominio}», che non esiste: forse è ${r.suggerimento}? Correggilo, altrimenti il biglietto non arriva.`
      : `L'indirizzo email finisce con «${r.dominio}», che non esiste. Correggilo, altrimenti il biglietto non arriva.`;
  }
  if (confermata) return null;
  return `Controlla l'indirizzo email: forse è ${r.suggerimento}? Correggilo, altrimenti il biglietto non arriva. Se è giusto così, scegli «È giusto così» sotto il campo.`;
}

/** Solo codice e messaggio: il dettaglio di Postgres può contenere i valori (l'email). */
const descriviErrore = (e: { code?: string; message?: string } | null | undefined) =>
  e ? `${e.code ?? "?"} ${e.message ?? ""}`.trim() : "sconosciuto";

/**
 * L'utente del Member Portal da collegare all'iscrizione, senza crearne uno:
 * chi è loggato, se l'email è la sua; altrimenti un profilo con quell'email.
 * Non blocca mai: in caso di problemi torna null.
 */
async function utenteEsistente(client: SupabaseClient, email: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Chi è loggato e iscrive un'altra persona non le presta il suo account.
    if (user && (user.email ?? "").trim().toLowerCase() === email) return user.id;
  } catch (err) {
    console.error("Iscrizione evento: lettura della sessione non riuscita:", err instanceof Error ? err.message : err);
  }
  try {
    const { data, error } = await client.from("profiles").select("id").eq("email", email).limit(1).maybeSingle();
    if (error) {
      console.error("Iscrizione evento: ricerca del profilo non riuscita:", descriviErrore(error));
      return null;
    }
    return (data as { id?: string } | null)?.id ?? null;
  } catch (err) {
    console.error("Iscrizione evento: ricerca del profilo non riuscita:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Crea l'account del Member Portal dopo l'iscrizione e lo collega. Un
 * fallimento non tocca l'iscrizione, che resta valida senza account.
 */
async function creaAccount(
  client: SupabaseClient,
  registrationId: string,
  email: string,
  nomeCompleto: string,
): Promise<boolean> {
  try {
    // Chi si reiscrive ha già l'account collegato dalla prima volta: niente doppioni.
    const { data: riga } = await client.from("event_registrations").select("user_id").eq("id", registrationId).maybeSingle();
    if ((riga as { user_id?: string | null } | null)?.user_id) return false;

    const { data, error } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: nomeCompleto },
    });
    if (error || !data.user) {
      console.error(`Iscrizione evento ${registrationId}: account non creato:`, descriviErrore(error as { code?: string; message?: string }));
      return false;
    }
    const { error: linkError } = await client
      .from("event_registrations")
      .update({ user_id: data.user.id })
      .eq("id", registrationId)
      .is("user_id", null);
    if (linkError) {
      console.error(`Iscrizione evento ${registrationId}: account creato ma non collegato:`, descriviErrore(linkError));
    }
    return true;
  } catch (err) {
    console.error(`Iscrizione evento ${registrationId}: account non creato:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (ARCHIVE_MODE) {
      return errore(403, "Le iscrizioni sono chiuse.");
    }

    let body: Record<string, unknown>;
    try {
      const letto: unknown = await request.json();
      if (!letto || typeof letto !== "object" || Array.isArray(letto)) throw new Error("corpo non valido");
      body = letto as Record<string, unknown>;
    } catch {
      return errore(400, "Richiesta non valida. Ricarica la pagina e riprova.");
    }

    // Honeypot compilato: un bot. Si risponde come a un successo, senza scrivere niente.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, sessions: [] });
    }

    const allowedSlugs = SESSIONS.map((s) => s.slug as string);
    const invalido = validaIscrizione(body, allowedSlugs);
    if (invalido) return errore(400, invalido.error, invalido.campo);

    const email = String(body.email).trim().toLowerCase();
    const msgRefuso = erroreRefuso(email, body.email_confermata === true);
    if (msgRefuso) return errore(400, msgRefuso, "email");

    const client = eventoAdminClient();
    if (!client) {
      console.error("Iscrizione evento: configurazione Supabase mancante (URL o service role).");
      return errore(503, "Le iscrizioni non sono disponibili in questo momento. Riprova tra qualche minuto o scrivi a info@bioergotech.org.");
    }

    const nome = String(body.nome).trim();
    const cognome = String(body.cognome).trim();
    const categoria = String(body.categoria).trim();
    const richieste = ordineEvento(body.sessioni as string[]);
    const marketing = body.consenso_marketing === true;

    // ── 1. Le giornate scelte esistono nel database? Prima di scrivere. ──
    // L'RPC salta in silenzio una giornata che non trova: è così che a
    // novembre 2026 si sono perse le scelte del 10 dicembre. Qui ci si ferma.
    const mancanti = (await giornateMancantiNelDatabase(client)).filter((slug) => richieste.includes(slug));
    if (mancanti.length > 0) {
      console.error(
        `ISCRIZIONI EVENTO BLOCCATE: le giornate ${mancanti.join(", ")} non sono in event_sessions. ` +
          "Esegui supabase/migrations/20261231300000_event_giorno1_ripristino.sql sul database di produzione.",
      );
      return errore(
        503,
        `In questo momento non riusciamo a registrare l'iscrizione per ${giornateConArticolo(mancanti)}. Riprova tra qualche minuto o scrivi a info@bioergotech.org.`,
        "sessioni",
      );
    }

    // ── 2. La stessa email per un'altra persona? ──
    let esistente: IscrizioneEvento | null;
    try {
      esistente = await caricaIscrizione(client, { email });
    } catch (err) {
      console.error("Iscrizione evento: lettura dell'iscrizione esistente non riuscita:", err instanceof Error ? err.message : err);
      return errore(500, ERRORE_GENERICO);
    }
    if (esistente && normalizzaNome(esistente.nome) !== normalizzaNome(nome)) {
      return errore(
        409,
        "Questo indirizzo email è già stato usato per l'iscrizione di un'altra persona. Ogni partecipante si iscrive con la propria email. Se l'iscrizione è la tua e vuoi correggere il nome, scrivi a info@bioergotech.org.",
        "email",
      );
    }

    // ── 3. L'account da collegare, se c'è già (la creazione viene dopo) ──
    const userId = await utenteEsistente(client, email);

    // Chi si reiscrive lasciando vuoto un campo facoltativo non perde quello
    // che aveva scritto la prima volta: l'RPC sovrascrive tutti i campi.
    const stessaCategoria = esistente?.categoria === categoria;
    const telefono = facoltativo(body.telefono, 40) ?? esistente?.telefono ?? null;
    const organizzazione = facoltativo(body.organizzazione, 200) ?? (stessaCategoria ? esistente?.organizzazione ?? null : null);
    const classe = facoltativo(body.classe, 60) ?? (stessaCategoria ? esistente?.classe ?? null : null);
    const note = facoltativo(body.note, 1000) ?? esistente?.note ?? null;
    const conStartup = categoria === "startup";

    // ── 4. L'iscrizione, atomica e con il controllo dei posti ──
    let result: RegistrationResult | null = null;
    for (let tentativo = 0; tentativo < 2 && !result; tentativo++) {
      const { data, error } = await client.rpc("event_register", {
        p_user_id: userId,
        p_nome: nome,
        p_cognome: cognome,
        p_email: email,
        p_telefono: telefono,
        p_categoria: categoria,
        p_organizzazione: organizzazione,
        p_classe: classe,
        p_startup_name: conStartup ? facoltativo(body.startup_name, 160) : null,
        p_startup_url: conStartup ? facoltativo(body.startup_url, 300) : null,
        p_startup_desc: conStartup ? facoltativo(body.startup_desc, 2000) : null,
        p_referente: facoltativo(body.referente, 200),
        p_note: note,
        p_marketing: marketing,
        p_marketing_testo: CONSENSO_MARKETING_TESTO,
        p_codice: generateCodice(),
        p_session_slugs: richieste,
      });
      if (!error) {
        result = data as RegistrationResult;
        break;
      }
      // Un codice già usato (raro): si riprova una volta con un codice nuovo.
      const codiceDoppio = error.code === "23505" && /codice/i.test(error.message ?? "");
      console.error(`Iscrizione evento: event_register non riuscita (tentativo ${tentativo + 1}):`, descriviErrore(error));
      if (!codiceDoppio) return errore(500, ERRORE_GENERICO);
    }
    if (!result || typeof result.registration_id !== "string" || !Array.isArray(result.sessions)) {
      console.error("Iscrizione evento: risposta di event_register senza registration_id o sessions.");
      return errore(500, ERRORE_GENERICO);
    }

    // ── 5. Ogni giornata scelta è tornata? Se no, niente email e niente "confermato". ──
    const tornate = new Set(result.sessions.map((s) => s.slug));
    const perse = richieste.filter((slug) => !tornate.has(slug));
    if (perse.length > 0) {
      console.error(
        `ISCRIZIONE EVENTO INCOMPLETA: registrazione ${result.registration_id}, richieste [${richieste.join(", ")}], ` +
          `salvate [${[...tornate].join(", ")}], mancanti [${perse.join(", ")}].`,
      );
      return errore(500, "Non siamo riusciti a registrare tutte le giornate scelte. Riprova o scrivi a info@bioergotech.org.");
    }

    // ── 6. Account del Member Portal: se non c'è, si crea ora, senza bloccare ──
    const nuovoAccount = userId ? false : await creaAccount(client, result.registration_id, email, `${nome} ${cognome}`.trim());

    // ── 7. Bacino marketing unificato: stesso pool del resto del sito ──
    if (marketing) {
      const { error: nlError } = await client.from("newsletter_subscribers").upsert(
        {
          email,
          full_name: `${nome} ${cognome}`.trim(),
          source: "evento-vivere-piu-a-lungo",
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
      if (nlError) {
        console.error(`Iscrizione evento ${result.registration_id}: newsletter non aggiornata:`, descriviErrore(nlError));
      }
    }

    // ── 8. Tutte le giornate della persona, e il biglietto per email ──
    let iscr: IscrizioneEvento | null = null;
    try {
      iscr = await caricaIscrizione(client, { id: result.registration_id });
    } catch (err) {
      console.error(`Iscrizione evento ${result.registration_id}: rilettura non riuscita:`, err instanceof Error ? err.message : err);
    }

    const giornate: { slug: string; status: SessionStatus }[] = iscr
      ? iscr.giornate.map((g) => ({ slug: g.slug, status: g.status }))
      : result.sessions.map((s) => ({ slug: s.slug, status: s.status }));
    const sessions = ordineEvento(giornate.map((g) => g.slug)).map(
      (slug) => giornate.find((g) => g.slug === slug) as { slug: string; status: SessionStatus },
    );
    const avevaGia = new Set((esistente?.giornate ?? []).map((g) => g.slug));
    const nuove = richieste.filter((slug) => !avevaGia.has(slug));

    let emailInviata = false;
    if (!process.env.RESEND_API_KEY) {
      console.error(`Iscrizione evento ${result.registration_id}: RESEND_API_KEY mancante, biglietto non inviato.`);
    } else if (!iscr) {
      console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato, iscrizione non riletta.`);
    } else {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const aggiungibili = giornateAggiungibili(iscr, await postiPerGiornata(client));
        const esito = await inviaBiglietto(resend, iscr, "iscrizione", { nuovoAccount, aggiungibili });
        if (esito.ok) {
          emailInviata = true;
        } else {
          console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato:`, esito.errore);
        }
      } catch (err) {
        console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato:`, err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({
      success: true,
      codice: iscr?.codice || result.codice,
      sessions,
      nuove,
      nuovoAccount,
      emailInviata,
    });
  } catch (err) {
    console.error("Iscrizione evento: errore inatteso:", err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
}
