import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  validaPrenotazioneClasse,
  type CampoClasse,
  type DatiPrenotazioneClasse,
  type ErroreClasse,
  type PrenotazioneClasse,
} from "@/lib/eventi/classi";
import {
  adesioneDaCodice,
  inviaEmailClasse,
  ordineGiornate,
  prenotaClasse,
  type EsitoPrenotazione,
} from "@/lib/eventi/classi-server";
import { eventoAdminClient, giornateMancantiNelDatabase } from "@/lib/eventi/evento-server";
import { refusoEmail } from "@/lib/eventi/email-refusi";
import {
  ARCHIVE_MODE,
  CONSENSO_PRIVACY_CLASSI_TESTO,
  SESSIONS,
  giornateConArticolo,
  sessionBySlug,
} from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/classi: la prenotazione di una classe dal modulo delle
 * scuole. Una prenotazione è una classe di una scuola, prenotata da un
 * docente, fino a 40 persone docenti compresi; nessun dato degli studenti.
 *
 * Corpo: { istituto, comune, classe, docente_nome, docente_cognome,
 *   docente_email, docente_telefono, studenti, accompagnatori, note,
 *   giornate: string[], consenso_privacy: true, adesione?: "LIC-XXXXXXXX",
 *   email_confermata?: boolean, website?: "" }
 *   - adesione: il codice dell'invito alle scuole del percorso dei licei; se
 *     non vale si ignora, la prenotazione non si ferma per questo;
 *   - email_confermata: chi prenota ha detto che un indirizzo "sospetto"
 *     (a una lettera da un servizio noto) è giusto così;
 *   - website: il campo nascosto contro i bot. Deve restare vuoto.
 *
 * Risposta 200, prenotazione nuova:
 *   { success: true, codice, giornate: [{ slug, status }], emailInviata }
 * Risposta 200, la stessa classe (stesso docente, scuola e classe) era già
 * prenotata, chiunque chiami:
 *   { success: true, giaPrenotata: true, codice: null, giornate: [], emailInviata }
 *   Le giornate scelte si aggiungono; codice e giornate arrivano solo per
 *   email, all'indirizzo salvato. Il codice basta a gestire la prenotazione,
 *   quindi non si mostra a chi conosce solo email, scuola e classe.
 * Errori: { error, campo? }. 400 (dati non validi, giornata conclusa, refuso
 * nell'email), 410 (evento archiviato), 429 (troppe richieste dalla stessa
 * rete), 503 (una giornata manca nel database, o configurazione mancante),
 * 500.
 *
 * Come per le persone: nessuna giornata si perde in silenzio (se una manca
 * nel database ci si ferma prima di scrivere; se l'RPC non la restituisce si
 * risponde con un errore e non parte nessuna email), e "email inviata" è
 * vero solo se Resend ha accettato l'email.
 */

const ERRORE_GENERICO =
  "Non siamo riusciti a completare la prenotazione. Riprova tra qualche istante: se era già arrivata non viene duplicata. Se il problema continua, scrivi a info@bioergotech.org.";

const errore = (status: number, error: string, campo?: CampoClasse) =>
  NextResponse.json<ErroreClasse>(campo ? { error, campo } : { error }, { status });

/** "del 10 dicembre", "dell'11 dicembre". */
const dellaGiornata = (slug: string) => {
  const conArt = giornateConArticolo([slug]);
  return conArt.startsWith("l'") ? `dell'${conArt.slice(2)}` : `del ${conArt.replace(/^il /, "")}`;
};

/** Il messaggio per le giornate scelte che si sono già concluse. */
function messaggioConcluse(concluse: string[], adesso: number): string {
  if (SESSIONS.every((s) => adesso > Date.parse(s.fineISO))) {
    return "L'evento si è concluso: le prenotazioni sono chiuse.";
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
      ? `L'indirizzo email finisce con «${r.dominio}», che non esiste: forse è ${r.suggerimento}? Correggilo, altrimenti la prenotazione con il QR non arriva.`
      : `L'indirizzo email finisce con «${r.dominio}», che non esiste. Correggilo, altrimenti la prenotazione con il QR non arriva.`;
  }
  if (confermata) return null;
  return `Controlla l'indirizzo email: forse è ${r.suggerimento}? Correggilo, altrimenti la prenotazione con il QR non arriva. Se è giusto così, scegli «È giusto così» sotto il campo.`;
}

const testo = (v: unknown): string => (typeof v === "string" ? v : "");

/** Un numero intero scritto nel modulo: un numero o una stringa di cifre. Altrimenti NaN, e la validazione lo dice. */
const intero = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\s*\d{1,3}\s*$/.test(v)) return Number(v.trim());
  return Number.NaN;
};

/* ── Limiti in memoria (best effort: valgono per istanza del server) ── */

/**
 * Richieste per indirizzo IP. Largo di proposito: più docenti della stessa
 * scuola prenotano dalla stessa rete. Ferma uno script, non una scuola.
 */
const FINESTRA_IP_MS = 10 * 60 * 1000;
const MAX_PER_IP = 200;
const richiestePerIp = new Map<string, { n: number; da: number }>();

/** L'email di una prenotazione che c'è già non riparte più di una volta ogni due minuti. */
const ATTESA_EMAIL_MS = 2 * 60 * 1000;
/** Quando Resend ha accettato l'ultima email, per prenotazione. Solo gli invii riusciti. */
const ultimaEmail = new Map<string, number>();
/**
 * Gli invii in corso, per prenotazione. Chi ripete la prenotazione mentre
 * l'email sta ancora partendo aspetta quell'invio e ne riporta l'esito vero,
 * senza mandarne un secondo. Ogni voce si toglie appena l'invio finisce.
 */
const invioInCorso = new Map<string, Promise<boolean>>();

/** Manda l'email della prenotazione, segnandola in corso fino alla fine. Non lancia. */
function inviaEmailPrenotazione(resend: Resend, p: PrenotazioneClasse): Promise<boolean> {
  const invio: Promise<boolean> = inviaEmailClasse(resend, p, "prenotazione")
    .then((esito) => {
      if (esito.ok) {
        ultimaEmail.set(p.id, Date.now());
        return true;
      }
      console.error(`Prenotazione classe ${p.id}: email non inviata:`, esito.errore);
      return false;
    })
    .catch((err: unknown) => {
      console.error(`Prenotazione classe ${p.id}: email non inviata:`, err instanceof Error ? err.message : err);
      return false;
    })
    .finally(() => {
      if (invioInCorso.get(p.id) === invio) invioInCorso.delete(p.id);
    });
  invioInCorso.set(p.id, invio);
  return invio;
}

function pulisciMappe(adesso: number) {
  if (richiestePerIp.size > 1000) {
    for (const [k, v] of richiestePerIp) if (adesso - v.da >= FINESTRA_IP_MS) richiestePerIp.delete(k);
  }
  if (ultimaEmail.size > 1000) {
    for (const [k, t] of ultimaEmail) if (adesso - t >= ATTESA_EMAIL_MS) ultimaEmail.delete(k);
  }
}

function indirizzo(request: Request): string | null {
  const inoltrato = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return inoltrato || request.headers.get("x-real-ip")?.trim() || null;
}

/** Conta la richiesta e dice se l'indirizzo ha superato il limite. Senza un indirizzo non si limita. */
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

export async function POST(request: Request) {
  try {
    if (ARCHIVE_MODE) {
      return errore(410, "L'evento si è concluso: le prenotazioni sono chiuse.");
    }

    const adesso = Date.now();
    pulisciMappe(adesso);
    if (oltreIlLimite(indirizzo(request), adesso)) {
      console.warn("Prenotazione classe: troppe richieste dallo stesso indirizzo, risposta 429.");
      return errore(
        429,
        "Abbiamo ricevuto molte prenotazioni da questa rete in pochi minuti. Riprova tra qualche minuto. Se devi prenotare molte classi, scrivi a info@bioergotech.org.",
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

    // Honeypot compilato: un bot. Si risponde come a un successo, senza
    // scrivere niente, e lo si segnala nei log (senza dati personali).
    if (typeof body.website === "string" && body.website.trim() !== "") {
      console.warn("Prenotazione classe: campo nascosto compilato, richiesta scartata.");
      return NextResponse.json({ success: true, codice: null, giornate: [], emailInviata: false });
    }

    const giornateValide = SESSIONS.map((s) => s.slug as string);
    const giornateRichieste = Array.isArray(body.giornate) ? body.giornate : [];
    if (giornateRichieste.some((g) => typeof g !== "string")) {
      return errore(400, "Una delle giornate scelte non è valida. Ricarica la pagina e scegli di nuovo.", "giornate");
    }
    const dati: DatiPrenotazioneClasse = {
      istituto: testo(body.istituto),
      comune: testo(body.comune),
      classe: testo(body.classe),
      docente_nome: testo(body.docente_nome),
      docente_cognome: testo(body.docente_cognome),
      docente_email: testo(body.docente_email),
      docente_telefono: testo(body.docente_telefono),
      studenti: intero(body.studenti),
      accompagnatori: intero(body.accompagnatori),
      note: testo(body.note),
      giornate: [...new Set(giornateRichieste as string[])],
      consenso_privacy: body.consenso_privacy === true,
    };
    const invalido = validaPrenotazioneClasse(dati, giornateValide);
    if (invalido) return errore(400, invalido.error, invalido.campo);

    const richieste = ordineGiornate(dati.giornate);

    // Una giornata già conclusa non si prenota più. Fino alla fine della
    // giornata sì: una classe può ancora arrivare.
    const concluse = richieste.filter((slug) => {
      const s = sessionBySlug(slug);
      return Boolean(s && adesso > Date.parse(s.fineISO));
    });
    if (concluse.length > 0) return errore(400, messaggioConcluse(concluse, adesso), "giornate");

    const email = dati.docente_email.trim().toLowerCase();
    const confermata = body.email_confermata === true || body.docente_email_confermata === true;
    const msgRefuso = erroreRefuso(email, confermata);
    if (msgRefuso) return errore(400, msgRefuso, "docente_email");

    const client = eventoAdminClient();
    if (!client) {
      console.error("Prenotazione classe: configurazione Supabase mancante (URL o service role).");
      return errore(503, "Le prenotazioni non sono disponibili in questo momento. Riprova tra qualche minuto o scrivi a info@bioergotech.org.");
    }

    // ── 1. Le giornate scelte esistono nel database? Prima di scrivere. ──
    let mancanti: string[];
    try {
      mancanti = (await giornateMancantiNelDatabase(client)).filter((slug) => richieste.includes(slug));
    } catch (err) {
      console.error("Prenotazione classe: lettura delle giornate non riuscita:", err instanceof Error ? err.message : err);
      return errore(500, ERRORE_GENERICO);
    }
    if (mancanti.length > 0) {
      console.error(
        `PRENOTAZIONI CLASSI BLOCCATE: le giornate ${mancanti.join(", ")} non sono in event_sessions. ` +
          "Esegui supabase/migrations/20261231300000_event_giorno1_ripristino.sql sul database di produzione.",
      );
      return errore(
        503,
        `In questo momento non riusciamo a registrare la prenotazione per ${giornateConArticolo(mancanti)}. Riprova tra qualche minuto o scrivi a info@bioergotech.org.`,
        "giornate",
      );
    }

    // ── 2. L'invito del percorso dei licei, se c'è (non ferma mai la prenotazione) ──
    let adesioneId: string | null = null;
    if (typeof body.adesione === "string" && body.adesione.trim()) {
      const adesione = await adesioneDaCodice(client, body.adesione);
      adesioneId = adesione?.id ?? null;
      if (!adesione) console.info("Prenotazione classe: codice dell'invito non riconosciuto, prenotazione senza adesione.");
    }

    // ── 3. La prenotazione, atomica e con il controllo dei posti ──
    let esito: EsitoPrenotazione;
    try {
      esito = await prenotaClasse(client, {
        ...dati,
        giornate: richieste,
        docente_email: email,
        licei_adesione_id: adesioneId,
        privacy_testo: CONSENSO_PRIVACY_CLASSI_TESTO,
      });
    } catch (err) {
      console.error("Prenotazione classe: non riuscita:", err instanceof Error ? err.message : err);
      return errore(500, ERRORE_GENERICO);
    }
    const p = esito.prenotazione;
    const aggiunte = esito.giornate.filter((g) => g.nuova).map((g) => g.slug);

    // ── 4. L'email con il QR, all'indirizzo della prenotazione ──
    // Chi ripete la stessa prenotazione senza aggiungere niente non la fa
    // ripartire più di una volta ogni due minuti: è già nella sua casella.
    // Se l'email sta ancora partendo, si aspetta quell'invio e se ne riporta
    // l'esito: "inviata" solo se Resend l'ha accettata davvero.
    let emailInviata = false;
    const ripetuta = !esito.nuova && aggiunte.length === 0;
    const inCorso = ripetuta ? invioInCorso.get(p.id) : undefined;
    const ultima = ultimaEmail.get(p.id);
    if (inCorso) {
      emailInviata = await inCorso;
      console.info(`Prenotazione classe ${p.id}: email già in partenza, non ripartita (${emailInviata ? "inviata" : "non inviata"}).`);
    } else if (ripetuta && ultima !== undefined && Date.now() - ultima < ATTESA_EMAIL_MS) {
      emailInviata = true;
      console.info(`Prenotazione classe ${p.id}: email già inviata da poco, non ripartita.`);
    } else if (!process.env.RESEND_API_KEY) {
      console.error(`Prenotazione classe ${p.id}: RESEND_API_KEY mancante, email non inviata.`);
    } else {
      emailInviata = await inviaEmailPrenotazione(new Resend(process.env.RESEND_API_KEY), p);
    }

    if (!esito.nuova) {
      // La classe c'era già: codice e giornate solo per email.
      console.info(`Prenotazione classe ${p.id}: già prenotata, giornate aggiunte [${aggiunte.join(", ")}].`);
      return NextResponse.json({ success: true, giaPrenotata: true, codice: null, giornate: [], emailInviata });
    }

    console.info(
      `Prenotazione classe ${p.id}: nuova, ${p.posti} posti, ` +
        `${esito.giornate.map((g) => `${g.slug} ${g.status}`).join(", ")}${adesioneId ? ", dal percorso dei licei" : ""}.`,
    );
    const giornate = ordineGiornate(p.giornate.map((g) => g.slug))
      .map((slug) => p.giornate.find((g) => g.slug === slug))
      .filter((g): g is NonNullable<typeof g> => Boolean(g))
      .map((g) => ({ slug: g.slug, status: g.status }));
    return NextResponse.json({ success: true, codice: p.codice, giornate, emailInviata });
  } catch (err) {
    console.error("Prenotazione classe: errore inatteso:", err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
}
