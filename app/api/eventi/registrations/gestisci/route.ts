import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { RegistrationResult } from "@/lib/eventi/registration";
import {
  caricaIscrizione,
  eventoAdminClient,
  giornateAggiungibili,
  inviaBiglietto,
  postiPerGiornata,
  pulisciCodice,
  type IscrizioneEvento,
} from "@/lib/eventi/evento-server";
import { ARCHIVE_MODE, giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/registrations/gestisci: il biglietto online gestito da
 * chi lo ha, senza login. Il codice del biglietto fa da chiave.
 *
 * Corpo: { codice, azione: "annulla" | "aggiungi" | "reinvia", giornata? }
 *
 * - annulla: libera il posto di una giornata. Se non resta nessuna
 *   giornata, l'iscrizione viene cancellata ({ annullata: true }).
 * - aggiungi: aggiunge una giornata con i dati già salvati, con il
 *   controllo dei posti dell'RPC (confermato o lista d'attesa), e manda il
 *   biglietto aggiornato.
 * - reinvia: rimanda il biglietto all'indirizzo dell'iscrizione. Al massimo
 *   una volta ogni due minuti per codice.
 *
 * Un codice malformato e uno sconosciuto hanno la stessa risposta (404):
 * da fuori non si distingue un codice che esiste da uno che non esiste.
 */

type Azione = "annulla" | "aggiungi" | "reinvia";
const AZIONI: readonly Azione[] = ["annulla", "aggiungi", "reinvia"];

const NON_TROVATO =
  "Non troviamo questo biglietto. Apri il link dall'email di conferma; se il problema continua, scrivi a info@bioergotech.org.";
const ERRORE_GENERICO = "Non siamo riusciti a completare l'operazione. Riprova tra qualche istante.";
const AIUTO = "Per qualsiasi necessità scrivi a info@bioergotech.org.";

const errore = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/** Solo codice e messaggio: il dettaglio di Postgres può contenere i valori. */
const descriviErrore = (e: { code?: string; message?: string } | null | undefined) =>
  e ? `${e.code ?? "?"} ${e.message ?? ""}`.trim() : "sconosciuto";

/** "del 10 dicembre", "dell'11 dicembre". */
const dellaGiornata = (slug: string) => {
  const conArt = giornateConArticolo([slug]);
  return conArt.startsWith("l'") ? `dell'${conArt.slice(2)}` : `del ${conArt.replace(/^il /, "")}`;
};

/* ── Limiti in memoria (best effort: valgono per istanza del server) ── */

const ATTESA_REINVIO_MS = 2 * 60 * 1000;
const ultimoReinvio = new Map<string, number>();

/** Tentativi con un codice inesistente, per indirizzo: frena chi prova codici a caso. */
const FINESTRA_TENTATIVI_MS = 10 * 60 * 1000;
const MAX_TENTATIVI = 30;
const tentativiFalliti = new Map<string, { n: number; da: number }>();

function pulisciMappe(adesso: number) {
  if (ultimoReinvio.size > 500) {
    for (const [k, t] of ultimoReinvio) if (adesso - t > ATTESA_REINVIO_MS) ultimoReinvio.delete(k);
  }
  if (tentativiFalliti.size > 500) {
    for (const [k, v] of tentativiFalliti) if (adesso - v.da > FINESTRA_TENTATIVI_MS) tentativiFalliti.delete(k);
  }
}

function indirizzo(request: Request): string {
  const inoltrato = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return inoltrato || request.headers.get("x-real-ip") || "sconosciuto";
}

function troppiTentativi(ip: string, adesso: number): boolean {
  const t = tentativiFalliti.get(ip);
  return Boolean(t && adesso - t.da < FINESTRA_TENTATIVI_MS && t.n >= MAX_TENTATIVI);
}

function registraTentativo(ip: string, adesso: number) {
  const t = tentativiFalliti.get(ip);
  if (!t || adesso - t.da >= FINESTRA_TENTATIVI_MS) tentativiFalliti.set(ip, { n: 1, da: adesso });
  else t.n += 1;
}

/** La giornata è iniziata (o finita): da qui non si cambia più. */
const iniziata = (slug: string, adesso: number) => {
  const s = sessionBySlug(slug);
  return Boolean(s && adesso >= Date.parse(s.inizioISO));
};

/** Le colonne che l'RPC riscrive: per aggiungere una giornata si ripassano tali e quali. */
type RigaCompleta = {
  id: string;
  user_id: string | null;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  categoria: string;
  organizzazione: string | null;
  classe: string | null;
  startup_name: string | null;
  startup_url: string | null;
  startup_desc: string | null;
  referente: string | null;
  note: string | null;
  consenso_marketing: boolean | null;
  consenso_marketing_testo: string | null;
  codice_univoco: string;
};

export async function POST(request: Request) {
  const adesso = Date.now();
  pulisciMappe(adesso);

  let body: Record<string, unknown>;
  try {
    const letto: unknown = await request.json();
    if (!letto || typeof letto !== "object" || Array.isArray(letto)) throw new Error("corpo non valido");
    body = letto as Record<string, unknown>;
  } catch {
    return errore(400, "Richiesta non valida. Ricarica la pagina e riprova.");
  }

  const azione = body.azione as Azione;
  if (!AZIONI.includes(azione)) return errore(400, "Azione non valida. Ricarica la pagina e riprova.");

  const giornata = typeof body.giornata === "string" ? body.giornata : "";
  const sessione = sessionBySlug(giornata);
  if (azione !== "reinvia" && !sessione) {
    return errore(400, "Giornata non valida. Ricarica la pagina e riprova.");
  }

  if (ARCHIVE_MODE && azione !== "reinvia") {
    return errore(403, "L'evento si è concluso: il biglietto non si può più modificare.");
  }

  const ip = indirizzo(request);
  if (troppiTentativi(ip, adesso)) {
    return errore(429, "Troppi tentativi in poco tempo. Riprova tra qualche minuto.");
  }

  const codice = pulisciCodice(typeof body.codice === "string" ? body.codice : "");
  if (!codice) {
    registraTentativo(ip, adesso);
    return errore(404, NON_TROVATO);
  }

  const client = eventoAdminClient();
  if (!client) {
    console.error("Gestione biglietto: configurazione Supabase mancante (URL o service role).");
    return errore(503, "Il servizio non è disponibile in questo momento. Riprova tra qualche minuto.");
  }

  let iscr: IscrizioneEvento | null;
  try {
    iscr = await caricaIscrizione(client, { codice });
  } catch (err) {
    console.error("Gestione biglietto: lettura non riuscita:", err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
  if (!iscr) {
    registraTentativo(ip, adesso);
    return errore(404, NON_TROVATO);
  }

  try {
    switch (azione) {
      case "annulla":
        return await annulla(client, iscr, giornata, adesso);
      case "aggiungi":
        return await aggiungi(client, iscr, giornata, adesso);
      case "reinvia":
        return await reinvia(client, iscr, adesso);
    }
  } catch (err) {
    console.error(`Gestione biglietto ${iscr.id} (${azione}): errore inatteso:`, err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
}

type Client = NonNullable<ReturnType<typeof eventoAdminClient>>;

/* ── annulla ─────────────────────────────────────────────────────────── */

async function annulla(client: Client, iscr: IscrizioneEvento, slug: string, adesso: number) {
  const conArt = giornateConArticolo([slug]);
  const g = iscr.giornate.find((x) => x.slug === slug);
  if (!g) {
    // Già libero (un doppio clic, un'altra scheda): niente da fare.
    return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: false, invariato: true });
  }
  if (g.stato_checkin === "presente") {
    return errore(409, `Il tuo ingresso per ${conArt} è già registrato: il posto non si può più liberare. ${AIUTO}`);
  }
  if (iniziata(slug, adesso)) {
    return errore(409, `La giornata ${dellaGiornata(slug)} è già iniziata: da qui non si può più liberare il posto. ${AIUTO}`);
  }

  const { error: delError } = await client
    .from("event_registration_sessions")
    .delete()
    .eq("id", g.id)
    .eq("registration_id", iscr.id);
  if (delError) {
    console.error(`Gestione biglietto ${iscr.id}: giornata ${slug} non liberata:`, descriviErrore(delError));
    return errore(500, ERRORE_GENERICO);
  }

  // Resta qualche giornata? Si conta nel database, non in memoria: conta
  // anche una giornata che il sito non mostra, che non va cancellata da qui.
  const { count, error: countError } = await client
    .from("event_registration_sessions")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", iscr.id);
  if (countError) {
    console.error(`Gestione biglietto ${iscr.id}: conteggio delle giornate non riuscito:`, descriviErrore(countError));
    // Il posto è libero: è quello che conta. L'iscrizione vuota resta, e il pannello la vede.
    return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: false });
  }

  if ((count ?? 0) === 0) {
    const { error: regError } = await client.from("event_registrations").delete().eq("id", iscr.id);
    if (regError) {
      console.error(`Gestione biglietto ${iscr.id}: iscrizione senza giornate non cancellata:`, descriviErrore(regError));
      return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: false });
    }
    console.info(`Gestione biglietto ${iscr.id}: iscrizione annullata dalla persona (ultima giornata ${slug}).`);
    return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: true });
  }

  console.info(`Gestione biglietto ${iscr.id}: giornata ${slug} liberata (era ${g.status}).`);
  return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: false });
}

/* ── aggiungi ────────────────────────────────────────────────────────── */

async function aggiungi(client: Client, iscr: IscrizioneEvento, slug: string, adesso: number) {
  const conArt = giornateConArticolo([slug]);
  const gia = iscr.giornate.find((x) => x.slug === slug);
  if (gia) {
    return NextResponse.json({ success: true, azione: "aggiungi", giornata: slug, status: gia.status, invariato: true });
  }
  if (iniziata(slug, adesso)) {
    return errore(409, `La giornata ${dellaGiornata(slug)} è già iniziata: da qui non si può più aggiungere. ${AIUTO}`);
  }

  // La giornata esiste nel database? Senza, l'RPC la salterebbe in silenzio.
  const { data: sess, error: sessError } = await client.from("event_sessions").select("id").eq("slug", slug).maybeSingle();
  if (sessError || !sess) {
    console.error(
      `GESTIONE BIGLIETTO BLOCCATA: la giornata ${slug} non è in event_sessions` +
        (sessError ? ` (${descriviErrore(sessError)})` : "") +
        ". Esegui supabase/migrations/20261231300000_event_giorno1_ripristino.sql.",
    );
    return errore(503, `In questo momento non riusciamo ad aggiungere ${conArt}. Riprova tra qualche minuto o scrivi a info@bioergotech.org.`);
  }

  const { data: riga, error: rigaError } = await client
    .from("event_registrations")
    .select(
      "id, user_id, nome, cognome, email, telefono, categoria, organizzazione, classe, startup_name, startup_url, startup_desc, referente, note, consenso_marketing, consenso_marketing_testo, codice_univoco",
    )
    .eq("id", iscr.id)
    .maybeSingle();
  if (rigaError || !riga) {
    console.error(`Gestione biglietto ${iscr.id}: riga completa non letta:`, descriviErrore(rigaError));
    return errore(500, ERRORE_GENERICO);
  }
  const r = riga as RigaCompleta;

  // L'RPC riscrive tutti i campi dell'iscrizione: si ripassano quelli salvati,
  // così aggiungere una giornata non cambia nient'altro. Il codice resta.
  const { data: rpcData, error: rpcError } = await client.rpc("event_register", {
    p_user_id: r.user_id,
    p_nome: r.nome,
    p_cognome: r.cognome,
    p_email: r.email,
    p_telefono: r.telefono,
    p_categoria: r.categoria,
    p_organizzazione: r.organizzazione,
    p_classe: r.classe,
    p_startup_name: r.startup_name,
    p_startup_url: r.startup_url,
    p_startup_desc: r.startup_desc,
    p_referente: r.referente,
    p_note: r.note,
    p_marketing: r.consenso_marketing === true,
    p_marketing_testo: r.consenso_marketing_testo,
    p_codice: r.codice_univoco,
    p_session_slugs: [slug],
  });
  if (rpcError) {
    console.error(`Gestione biglietto ${iscr.id}: event_register non riuscita per ${slug}:`, descriviErrore(rpcError));
    return errore(500, ERRORE_GENERICO);
  }

  const result = rpcData as RegistrationResult | null;
  const tornata = result?.sessions?.find((s) => s.slug === slug);
  if (!result || result.registration_id !== iscr.id || !tornata) {
    console.error(
      `GESTIONE BIGLIETTO INCOMPLETA: registrazione ${iscr.id}, richiesta ${slug}, ` +
        `risposta ${result ? `${result.registration_id} [${(result.sessions ?? []).map((s) => s.slug).join(", ")}]` : "vuota"}.`,
    );
    return errore(500, `Non siamo riusciti ad aggiungere ${conArt}. Riprova o scrivi a info@bioergotech.org.`);
  }

  // Il biglietto aggiornato, con tutte le giornate. Un problema con l'email
  // non annulla l'aggiunta: la giornata è salvata e il biglietto online la mostra.
  let emailInviata = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const aggiornata = await caricaIscrizione(client, { id: iscr.id });
      if (aggiornata) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const aggiungibili = giornateAggiungibili(aggiornata, await postiPerGiornata(client));
        const esito = await inviaBiglietto(resend, aggiornata, "iscrizione", { aggiungibili });
        if (esito.ok) emailInviata = true;
        else console.error(`Gestione biglietto ${iscr.id}: biglietto aggiornato non inviato:`, esito.errore);
      }
    } catch (err) {
      console.error(`Gestione biglietto ${iscr.id}: biglietto aggiornato non inviato:`, err instanceof Error ? err.message : err);
    }
  } else {
    console.error(`Gestione biglietto ${iscr.id}: RESEND_API_KEY mancante, biglietto aggiornato non inviato.`);
  }

  console.info(`Gestione biglietto ${iscr.id}: giornata ${slug} aggiunta (${tornata.status}).`);
  return NextResponse.json({ success: true, azione: "aggiungi", giornata: slug, status: tornata.status, emailInviata });
}

/* ── reinvia ─────────────────────────────────────────────────────────── */

async function reinvia(client: Client, iscr: IscrizioneEvento, adesso: number) {
  const ultimo = ultimoReinvio.get(iscr.codice);
  if (ultimo && adesso - ultimo < ATTESA_REINVIO_MS) {
    const secondi = Math.ceil((ATTESA_REINVIO_MS - (adesso - ultimo)) / 1000);
    return errore(
      429,
      "Ti abbiamo appena rimandato il biglietto. Controlla la posta, anche nella cartella spam o Promozioni; se non arriva, riprova tra un paio di minuti.",
      { riprovaTra: secondi },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    console.error(`Gestione biglietto ${iscr.id}: RESEND_API_KEY mancante, reinvio impossibile.`);
    return errore(503, "L'invio delle email non è disponibile in questo momento. Riprova più tardi o scrivi a info@bioergotech.org.");
  }

  // Si segna subito, così due clic ravvicinati non mandano due email.
  ultimoReinvio.set(iscr.codice, adesso);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const aggiungibili = giornateAggiungibili(iscr, await postiPerGiornata(client));
  const esito = await inviaBiglietto(resend, iscr, "reinvio", { aggiungibili });
  if (!esito.ok) {
    ultimoReinvio.delete(iscr.codice);
    console.error(`Gestione biglietto ${iscr.id}: reinvio non riuscito:`, esito.errore);
    return errore(500, "Non siamo riusciti a inviare l'email. Riprova tra qualche minuto o scrivi a info@bioergotech.org.");
  }
  return NextResponse.json({ success: true, azione: "reinvia" });
}
