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
  caricaRigaCompleta,
  eventoAdminClient,
  giornateAggiungibili,
  giornateMancantiNelDatabase,
  inviaBiglietto,
  parametriConDatiSalvati,
  postiPerGiornata,
  type IscrizioneEvento,
  type RigaIscrizioneCompleta,
} from "@/lib/eventi/evento-server";
import {
  ARCHIVE_MODE,
  CONSENSO_MARKETING_TESTO,
  SESSIONS,
  giornateConArticolo,
  sessionBySlug,
} from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/registrations: l'iscrizione all'evento dal modulo.
 *
 * Risposta 200, iscrizione nuova o persona che ha fatto l'accesso con
 * quella stessa email:
 *   { success: true, codice, sessions, nuove, nuovoAccount, emailInviata }
 *   - sessions: TUTTE le giornate che la persona ha adesso (solo quelle che
 *     il sito conosce, nell'ordine dell'evento), non solo quelle di oggi;
 *   - nuove: le giornate aggiunte da questa richiesta;
 *   - nuovoAccount: l'account del Member Portal è stato appena creato;
 *   - emailInviata: il biglietto è partito (informativo: l'iscrizione vale
 *     comunque).
 * Risposta 200, email già iscritta e nessun accesso con quell'email:
 *   { success: true, giaIscritto: true, codice: null, sessions: [], nuove: [],
 *     nuovoAccount: false, emailInviata }
 *   Il biglietto parte all'indirizzo dell'iscrizione, e solo lì si vede il codice.
 * Errori: { error, campo? }, con campo fra nome, cognome, email, categoria,
 * sessioni, startup_name, consenso_privacy. Stati 400 (anche una giornata
 * già conclusa, con campo "sessioni"), 403 (iscrizioni chiuse), 409, 429
 * (troppe richieste dalla stessa rete), 503, 500.
 *
 * Le regole che contano più di tutte:
 * - nessuna giornata si perde in silenzio. Se una giornata manca nel
 *   database ci si ferma prima di scrivere (503); se l'RPC non la
 *   restituisce si risponde con un errore e non parte nessuna email;
 * - un'email appartiene a una persona. Un nome diverso si ferma (409), senza
 *   dire di chi è l'email. Con lo stesso nome, chi non ha fatto l'accesso con
 *   quell'email può solo aggiungere giornate: i dati salvati non cambiano, e
 *   codice e giornate arrivano soltanto all'indirizzo dell'iscrizione. Il
 *   codice basta a gestire il biglietto, quindi non si mostra a chi conosce
 *   solo email e nome di un'altra persona.
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

/** "del 10 dicembre", "dell'11 dicembre". */
const dellaGiornata = (slug: string) => {
  const conArt = giornateConArticolo([slug]);
  return conArt.startsWith("l'") ? `dell'${conArt.slice(2)}` : `del ${conArt.replace(/^il /, "")}`;
};

/** Il messaggio per le giornate scelte che si sono già concluse. */
function messaggioConcluse(concluse: string[], adesso: number): string {
  if (SESSIONS.every((s) => adesso > Date.parse(s.fineISO))) {
    return "L'evento si è concluso: le iscrizioni sono chiuse.";
  }
  const quali = concluse.map(dellaGiornata);
  const frase =
    quali.length === 1
      ? `La giornata ${quali[0]} si è conclusa`
      : `Le giornate ${quali.slice(0, -1).join(", ")} e ${quali[quali.length - 1]} si sono concluse`;
  return `${frase}: scegli un'altra giornata.`;
}

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

/* ── Limiti in memoria (best effort: valgono per istanza del server) ── */

/**
 * Richieste per indirizzo IP. Il limite è largo di proposito: una classe
 * intera si iscrive dalla rete della scuola, con un solo indirizzo.
 */
const FINESTRA_IP_MS = 10 * 60 * 1000;
const MAX_PER_IP = 60;
const richiestePerIp = new Map<string, { n: number; da: number }>();

/** Il biglietto di un'iscrizione che c'è già non riparte più di una volta ogni due minuti. */
const ATTESA_BIGLIETTO_MS = 2 * 60 * 1000;
const ultimoBiglietto = new Map<string, number>();

function pulisciMappe(adesso: number) {
  if (richiestePerIp.size > 1000) {
    for (const [k, v] of richiestePerIp) if (adesso - v.da >= FINESTRA_IP_MS) richiestePerIp.delete(k);
  }
  if (ultimoBiglietto.size > 1000) {
    for (const [k, t] of ultimoBiglietto) if (adesso - t >= ATTESA_BIGLIETTO_MS) ultimoBiglietto.delete(k);
  }
}

function indirizzo(request: Request): string | null {
  const inoltrato = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return inoltrato || request.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Conta la richiesta e dice se l'indirizzo ha superato il limite. Senza un
 * indirizzo non si limita: meglio un'iscrizione in più che tutti bloccati.
 */
function oltreIlLimite(ip: string | null, adesso: number): boolean {
  if (!ip) return false;
  const t = richiestePerIp.get(ip);
  if (!t || adesso - t.da >= FINESTRA_IP_MS) {
    richiestePerIp.set(ip, { n: 1, da: adesso });
    return false;
  }
  t.n += 1;
  return t.n > MAX_PER_IP;
}

/* ── Chi chiama ──────────────────────────────────────────────────────── */

/** La persona che ha fatto l'accesso al sito, se c'è. Non blocca mai: in caso di problemi torna null. */
async function utenteCollegato(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: (user.email ?? "").trim().toLowerCase() } : null;
  } catch (err) {
    console.error("Iscrizione evento: lettura della sessione non riuscita:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Il profilo del Member Portal con quell'email, da collegare all'iscrizione
 * senza crearne uno. Non dice niente su chi chiama. Non blocca mai.
 */
async function profiloConEmail(client: SupabaseClient, email: string): Promise<string | null> {
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

    const adesso = Date.now();
    pulisciMappe(adesso);
    if (oltreIlLimite(indirizzo(request), adesso)) {
      console.warn("Iscrizione evento: troppe richieste dallo stesso indirizzo, risposta 429.");
      return errore(
        429,
        "Abbiamo ricevuto molte iscrizioni da questa rete in pochi minuti. Riprova tra qualche minuto. Se stai iscrivendo un gruppo numeroso, scrivi a info@bioergotech.org.",
      );
    }

    let body: Record<string, unknown>;
    try {
      const letto: unknown = await request.json();
      if (!letto || typeof letto !== "object" || Array.isArray(letto)) throw new Error("corpo non valido");
      body = letto as Record<string, unknown>;
    } catch {
      return errore(400, "Richiesta non valida. Ricarica la pagina e riprova.");
    }

    // Honeypot compilato: un bot. Si risponde come a un successo, senza scrivere
    // niente, e lo si segnala nei log (senza dati personali) per vedere se succede.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      console.warn("Iscrizione evento: campo nascosto compilato, richiesta scartata.");
      return NextResponse.json({ success: true, sessions: [] });
    }

    const allowedSlugs = SESSIONS.map((s) => s.slug as string);
    const invalido = validaIscrizione(body, allowedSlugs);
    if (invalido) return errore(400, invalido.error, invalido.campo);

    const richieste = ordineEvento(body.sessioni as string[]);

    // Una giornata già conclusa non si sceglie più: il posto non servirebbe a
    // nessuno e falserebbe i conteggi. Fino alla fine della giornata ci si può
    // ancora iscrivere (anche sul posto, dal QR stampato).
    const concluse = richieste.filter((slug) => {
      const s = sessionBySlug(slug);
      return Boolean(s && adesso > Date.parse(s.fineISO));
    });
    if (concluse.length > 0) return errore(400, messaggioConcluse(concluse, adesso), "sessioni");

    const email = String(body.email).trim().toLowerCase();
    const msgRefuso = erroreRefuso(email, body.email_confermata === true);
    if (msgRefuso) return errore(400, msgRefuso, "email");

    const client = eventoAdminClient();
    if (!client) {
      console.error("Iscrizione evento: configurazione Supabase mancante (URL o service role).");
      return errore(503, "Le iscrizioni non sono disponibili in questo momento. Riprova tra qualche minuto o scrivi a info@bioergotech.org.");
    }

    const nomeRichiesto = String(body.nome).trim();
    const cognomeRichiesto = String(body.cognome).trim();
    const categoria = String(body.categoria).trim();
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
    if (esistente && normalizzaNome(esistente.nome) !== normalizzaNome(nomeRichiesto)) {
      return errore(
        409,
        "Questo indirizzo email è già stato usato per l'iscrizione di un'altra persona. Ogni partecipante si iscrive con la propria email. Se stai iscrivendo un'altra persona, per esempio un figlio o una figlia, usa un altro indirizzo email; se non ne avete un altro, scrivi a info@bioergotech.org e ti aiutiamo. Scrivici anche se l'iscrizione è la tua e vuoi correggere il nome.",
        "email",
      );
    }

    // ── 3. Chi chiama, e l'account da collegare (la creazione viene dopo) ──
    // Titolare: ha fatto l'accesso al sito con questa stessa email. Chi è
    // loggato e iscrive un'altra persona non le presta il suo account: si
    // collega, se c'è, il profilo con l'email dell'iscrizione.
    const collegato = await utenteCollegato();
    const titolare = collegato !== null && collegato.email === email;
    const userId = titolare ? collegato.id : await profiloConEmail(client, email);

    // ── 4. Un'iscrizione che c'è già, e chi chiama non ne è il titolare ──
    // Bastano email e nome per arrivare qui. Si possono solo aggiungere
    // giornate: all'RPC vanno i dati già salvati, non quelli della richiesta,
    // e la risposta non dice né il codice né le giornate.
    const soloAggiunta = esistente !== null && !titolare;
    let salvata: RigaIscrizioneCompleta | null = null;
    if (esistente && soloAggiunta) {
      try {
        salvata = await caricaRigaCompleta(client, esistente.id);
      } catch (err) {
        console.error(`Iscrizione evento ${esistente.id}: riga completa non letta:`, err instanceof Error ? err.message : err);
        return errore(500, ERRORE_GENERICO);
      }
      if (!salvata) {
        // Cancellata un attimo fa (per esempio dal biglietto online): al prossimo tentativo è un'iscrizione nuova.
        console.error(`Iscrizione evento ${esistente.id}: iscrizione sparita fra due letture.`);
        return errore(500, ERRORE_GENERICO);
      }
    }

    const nome = salvata?.nome ?? nomeRichiesto;
    const cognome = salvata?.cognome ?? cognomeRichiesto;

    // Il titolare che si reiscrive lasciando vuoto un campo facoltativo non perde
    // quello che aveva scritto la prima volta: l'RPC sovrascrive tutti i campi.
    const stessaCategoria = esistente?.categoria === categoria;
    const telefono = facoltativo(body.telefono, 40) ?? esistente?.telefono ?? null;
    const organizzazione = facoltativo(body.organizzazione, 200) ?? (stessaCategoria ? esistente?.organizzazione ?? null : null);
    const classe = facoltativo(body.classe, 60) ?? (stessaCategoria ? esistente?.classe ?? null : null);
    const note = facoltativo(body.note, 1000) ?? esistente?.note ?? null;
    const conStartup = categoria === "startup";

    // ── 5. L'iscrizione, atomica e con il controllo dei posti ──
    const parametri = (codice: string) =>
      salvata
        ? {
            ...parametriConDatiSalvati(salvata, richieste),
            p_user_id: salvata.user_id ?? userId,
            // Il consenso marketing si può solo dare, mai togliere (lo garantisce l'RPC).
            p_marketing: marketing,
            p_marketing_testo: CONSENSO_MARKETING_TESTO,
            p_codice: codice,
          }
        : {
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
            p_codice: codice,
            p_session_slugs: richieste,
          };

    let result: RegistrationResult | null = null;
    for (let tentativo = 0; tentativo < 2 && !result; tentativo++) {
      // Per un'iscrizione che c'è già l'RPC tiene il codice salvato: questo vale solo per una nuova.
      const { data, error } = await client.rpc("event_register", parametri(generateCodice()));
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

    // ── 6. Ogni giornata scelta è tornata? Se no, niente email e niente "confermato". ──
    const tornate = new Set(result.sessions.map((s) => s.slug));
    const perse = richieste.filter((slug) => !tornate.has(slug));
    if (perse.length > 0) {
      console.error(
        `ISCRIZIONE EVENTO INCOMPLETA: registrazione ${result.registration_id}, richieste [${richieste.join(", ")}], ` +
          `salvate [${[...tornate].join(", ")}], mancanti [${perse.join(", ")}].`,
      );
      return errore(500, "Non siamo riusciti a registrare tutte le giornate scelte. Riprova o scrivi a info@bioergotech.org.");
    }

    // ── 7. Account del Member Portal: se non c'è, si crea ora, senza bloccare ──
    const nuovoAccount = userId ? false : await creaAccount(client, result.registration_id, email, `${nome} ${cognome}`.trim());

    // ── 8. Bacino marketing unificato: stesso pool del resto del sito ──
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

    // ── 9. Tutte le giornate della persona, e il biglietto per email ──
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

    // Chi ripete la stessa iscrizione senza aggiungere niente non fa ripartire
    // il biglietto più di una volta ogni due minuti: è già nella sua casella.
    let emailInviata = false;
    const ultimo = ultimoBiglietto.get(email);
    const appenaInviato =
      esistente !== null && nuove.length === 0 && ultimo !== undefined && Date.now() - ultimo < ATTESA_BIGLIETTO_MS;
    if (appenaInviato) {
      emailInviata = true;
      console.info(`Iscrizione evento ${result.registration_id}: biglietto già inviato da poco, non ripartito.`);
    } else if (!process.env.RESEND_API_KEY) {
      console.error(`Iscrizione evento ${result.registration_id}: RESEND_API_KEY mancante, biglietto non inviato.`);
    } else if (!iscr) {
      console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato, iscrizione non riletta.`);
    } else {
      // Si segna subito, così due invii ravvicinati non mandano due email.
      ultimoBiglietto.set(email, Date.now());
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const aggiungibili = giornateAggiungibili(iscr, await postiPerGiornata(client));
        const esito = await inviaBiglietto(resend, iscr, "iscrizione", { nuovoAccount, aggiungibili });
        if (esito.ok) {
          emailInviata = true;
        } else {
          ultimoBiglietto.delete(email);
          console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato:`, esito.errore);
        }
      } catch (err) {
        ultimoBiglietto.delete(email);
        console.error(`Iscrizione evento ${result.registration_id}: biglietto non inviato:`, err instanceof Error ? err.message : err);
      }
    }

    if (soloAggiunta) {
      // Codice e giornate solo per email, all'indirizzo dell'iscrizione.
      console.info(
        `Iscrizione evento ${result.registration_id}: reiscrizione senza accesso, giornate aggiunte [${nuove.join(", ")}].`,
      );
      return NextResponse.json({
        success: true,
        giaIscritto: true,
        codice: null,
        sessions: [],
        nuove: [],
        nuovoAccount: false,
        emailInviata,
      });
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
