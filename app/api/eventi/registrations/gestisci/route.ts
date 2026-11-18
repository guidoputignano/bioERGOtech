import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { RegistrationResult } from "@/lib/eventi/registration";
import {
  caricaIscrizione,
  caricaRigaCompleta,
  eventoAdminClient,
  giornateAggiungibili,
  inviaBiglietto,
  inviaConUnNuovoTentativo,
  parametriConDatiSalvati,
  postiPerGiornata,
  promuoviDaListaAttesa,
  pulisciCodice,
  type GiornataIscritto,
  type IscrizioneEvento,
  type RigaIscrizioneCompleta,
} from "@/lib/eventi/evento-server";
import { EMAIL_MITTENTE, EMAIL_RISPOSTE, emailAnnullamento } from "@/lib/eventi/email";
import { ARCHIVE_MODE, giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/registrations/gestisci: il biglietto online gestito da
 * chi lo ha, senza login. Il codice del biglietto fa da chiave.
 *
 * Corpo: { codice, azione: "annulla" | "aggiungi" | "reinvia", giornata? }
 *
 * - annulla: libera il posto di una giornata. Se non resta nessuna
 *   giornata, l'iscrizione viene cancellata ({ annullata: true }). La
 *   risposta dice anche com'era la giornata tolta (era: "confermato" o
 *   "lista_attesa"). Un posto confermato passa subito alla prima persona in
 *   lista d'attesa, che riceve il biglietto; il titolare riceve un breve
 *   avviso all'indirizzo dell'iscrizione, perché basta il codice per farlo.
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

  const { data: tolte, error: delError } = await client
    .from("event_registration_sessions")
    .delete()
    .eq("id", g.id)
    .eq("registration_id", iscr.id)
    .select("id");
  if (delError) {
    console.error(`Gestione biglietto ${iscr.id}: giornata ${slug} non liberata:`, descriviErrore(delError));
    return errore(500, ERRORE_GENERICO);
  }
  if (!tolte || tolte.length === 0) {
    // Tolta un attimo fa da un'altra richiesta (un doppio invio, un'altra
    // scheda): quella ha già passato il posto e avvisato il titolare.
    return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata: false, invariato: true });
  }
  const era = g.status;

  // Resta qualche giornata? Si conta nel database, non in memoria: conta
  // anche una giornata che il sito non mostra, che non va cancellata da qui.
  // Se il conteggio non riesce si usano le giornate lette prima: un'iscrizione
  // senza giornate non deve restare (ferma le comunicazioni a tutti).
  let rimaste: number;
  const { count, error: countError } = await client
    .from("event_registration_sessions")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", iscr.id);
  if (countError) {
    console.error(`Gestione biglietto ${iscr.id}: conteggio delle giornate non riuscito:`, descriviErrore(countError));
    rimaste = iscr.giornate.filter((x) => x.id !== g.id).length;
  } else {
    rimaste = count ?? 0;
  }

  let annullata = false;
  if (rimaste === 0) {
    const { error: regError } = await client.from("event_registrations").delete().eq("id", iscr.id);
    if (regError) {
      // Il posto è libero: è quello che conta. L'iscrizione vuota resta, e il pannello la vede.
      console.error(`Gestione biglietto ${iscr.id}: iscrizione senza giornate non cancellata:`, descriviErrore(regError));
    } else {
      annullata = true;
      console.info(`Gestione biglietto ${iscr.id}: iscrizione annullata dalla persona (ultima giornata ${slug}, era ${era}).`);
    }
  } else {
    console.info(`Gestione biglietto ${iscr.id}: giornata ${slug} liberata (era ${era}).`);
  }

  // Dopo la cancellazione, e senza mai far fallire la richiesta: il posto
  // confermato passa a chi è in lista d'attesa da più tempo, e il titolare
  // riceve l'avviso. Le due cose non lanciano.
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  await Promise.all([
    era === "confermato" ? promuoviDaListaAttesa(client, resend, slug) : Promise.resolve(null),
    avvisaTitolare(resend, iscr, g, annullata),
  ]);

  return NextResponse.json({ success: true, azione: "annulla", giornata: slug, annullata, era });
}

/**
 * Il breve avviso al titolare dopo un annullamento, all'indirizzo
 * dell'iscrizione. Con i dati in memoria: la riga può essere già cancellata.
 * Non lancia: se l'invio non riesce, resta il log.
 */
async function avvisaTitolare(resend: Resend | null, iscr: IscrizioneEvento, tolta: GiornataIscritto, annullata: boolean) {
  if (!resend) {
    console.error(`Gestione biglietto ${iscr.id}: RESEND_API_KEY mancante, avviso di annullamento non inviato.`);
    return;
  }
  try {
    const { subject, html, text } = emailAnnullamento({
      nome: iscr.nome,
      codice: iscr.codice,
      giornata: tolta.slug,
      era: tolta.status,
      annullata,
      rimaste: iscr.giornate.filter((x) => x.id !== tolta.id).map((x) => ({ slug: x.slug, status: x.status })),
    });
    const esito = await inviaConUnNuovoTentativo(() =>
      resend.emails.send({ from: EMAIL_MITTENTE, to: iscr.email, replyTo: EMAIL_RISPOSTE, subject, html, text }),
    );
    if (!esito.ok) console.error(`Gestione biglietto ${iscr.id}: avviso di annullamento non inviato:`, esito.errore);
  } catch (err) {
    console.error(`Gestione biglietto ${iscr.id}: avviso di annullamento non inviato:`, err instanceof Error ? err.message : err);
  }
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

  let r: RigaIscrizioneCompleta | null;
  try {
    r = await caricaRigaCompleta(client, iscr.id);
  } catch (err) {
    console.error(`Gestione biglietto ${iscr.id}: riga completa non letta:`, err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
  if (!r) {
    console.error(`Gestione biglietto ${iscr.id}: riga completa non trovata.`);
    return errore(500, ERRORE_GENERICO);
  }

  // L'RPC riscrive tutti i campi dell'iscrizione: si ripassano quelli salvati,
  // così aggiungere una giornata non cambia nient'altro. Il codice resta.
  const { data: rpcData, error: rpcError } = await client.rpc("event_register", parametriConDatiSalvati(r, [slug]));
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
