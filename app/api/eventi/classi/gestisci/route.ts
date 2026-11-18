import { NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { validaPrenotazioneClasse, type PrenotazioneClasse } from "@/lib/eventi/classi";
import {
  aggiornaNumeriClasse,
  annullaGiornataClasse,
  caricaClasse,
  giornateDaRivedereDopoRiduzione,
  inviaEmailClasse,
  prenotaClasse,
  promuoviDopoPostiLiberati,
  pulisciCodiceClasse,
  type EsitoPrenotazione,
} from "@/lib/eventi/classi-server";
import type { MotivoEmailClasse } from "@/lib/eventi/email-classi";
import { eventoAdminClient } from "@/lib/eventi/evento-server";
import {
  ARCHIVE_MODE,
  CONSENSO_PRIVACY_CLASSI_TESTO,
  SESSIONS,
  giornateConArticolo,
  sessionBySlug,
} from "@/app/eventi/vivere-piu-a-lungo/content";

/**
 * POST /api/eventi/classi/gestisci: la prenotazione di una classe gestita
 * dal docente, senza login. Il codice della classe fa da chiave.
 *
 * Corpo: { codice, azione, giornata?, studenti?, accompagnatori? }
 *
 * - aggiorna (studenti, accompagnatori): cambia i numeri. Meno persone si
 *   può sempre; di più solo se ci stanno in ogni giornata confermata.
 *   200 { success: true, posti_prima, posti_dopo, emailInviata }, oppure
 *   409 { error, giornata } se in quella giornata non ci stanno.
 * - annulla (giornata): toglie una giornata. Se non ne resta nessuna la
 *   prenotazione è cancellata. Non dopo l'inizio della giornata, né dopo che
 *   la classe è entrata. 200 { success: true, prenotazioneCancellata, era, emailInviata }.
 * - aggiungi (giornata): aggiunge l'altra giornata, con il controllo dei
 *   posti (confermata o lista d'attesa). Non dopo l'inizio della giornata.
 *   200 { success: true, status, emailInviata }.
 * - reinvia: rimanda l'email della classe all'indirizzo della prenotazione,
 *   al massimo una volta ogni due minuti dopo un invio riuscito (429). Un
 *   clic mentre l'email sta ancora partendo aspetta quell'invio e ne riporta
 *   l'esito. 200 { success: true }, oppure 500 se l'email non è partita.
 *
 * Ogni cambiamento manda al docente l'email aggiornata (o l'avviso di
 * annullamento): basta il codice per farlo, quindi il docente deve saperlo.
 * L'email non ferma mai il cambiamento, e emailInviata dice com'è andata.
 *
 * I posti liberati (una giornata tolta, meno persone) passano a chi aspetta,
 * prima alle classi e poi alle persone, DOPO la risposta: confermare decine
 * di persone vuol dire decine di email, e il docente non deve aspettarle.
 * Con meno persone si riguardano anche le giornate in cui la classe è in
 * lista d'attesa: più piccola, ora può starci.
 *
 * Errori { error }: 400, 404 (codice sconosciuto o malformato, stessa
 * risposta), 409, 410 (evento archiviato), 429, 500, 503.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Azione = "aggiorna" | "annulla" | "aggiungi" | "reinvia";
const AZIONI: readonly Azione[] = ["aggiorna", "annulla", "aggiungi", "reinvia"];

const NON_TROVATA =
  "Non troviamo questa prenotazione. Apri il link dall'email della prenotazione; se il problema continua, scrivi a info@bioergotech.org.";
const ERRORE_GENERICO = "Non siamo riusciti a completare l'operazione. Riprova tra qualche istante.";
const AIUTO = "Per qualsiasi necessità scrivi a info@bioergotech.org.";

const errore = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/** "del 10 dicembre", "dell'11 dicembre". */
const dellaGiornata = (slug: string) => {
  const conArt = giornateConArticolo([slug]);
  return conArt.startsWith("l'") ? `dell'${conArt.slice(2)}` : `del ${conArt.replace(/^il /, "")}`;
};

/** Un numero intero dal corpo: un numero o una stringa di cifre. Altrimenti NaN. */
const intero = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\s*\d{1,3}\s*$/.test(v)) return Number(v.trim());
  return Number.NaN;
};

/* ── Limiti in memoria (best effort: valgono per istanza del server) ── */

const ATTESA_REINVIO_MS = 2 * 60 * 1000;
/** Quando Resend ha accettato l'ultimo reinvio, per prenotazione. Solo gli invii riusciti. */
const ultimoReinvio = new Map<string, number>();
/**
 * I reinvii in corso, per prenotazione: un secondo clic mentre l'email sta
 * ancora partendo aspetta quell'invio e ne riporta l'esito, senza mandarne
 * un secondo. Ogni voce si toglie appena l'invio finisce.
 */
const reinvioInCorso = new Map<string, Promise<boolean>>();

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

const resendOppureNull = () => (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

/**
 * Un lavoro dopo la risposta (after di Next, che su Vercel tiene viva la
 * funzione fino alla fine). Fuori da una richiesta, per esempio in una
 * prova, si fa subito.
 */
async function dopoLaRisposta(lavoro: () => Promise<void>) {
  try {
    after(lavoro);
  } catch {
    await lavoro();
  }
}

/** I posti liberati in queste giornate passano a chi aspetta, dopo la risposta. Non lancia. */
function passaIPosti(client: SupabaseClient, resend: Resend | null, slugs: string[], prenotazioneId: string) {
  if (slugs.length === 0) return Promise.resolve();
  return dopoLaRisposta(async () => {
    for (const slug of slugs) {
      const r = await promuoviDopoPostiLiberati(client, resend, slug);
      if (r.classi.length > 0 || r.persone > 0) {
        console.info(
          `Prenotazione classe ${prenotazioneId}: posti liberati ${slug} passati a ${r.classi.length} classi e ${r.persone} persone.`,
        );
      }
    }
  });
}

/**
 * L'email al docente dopo un cambiamento. Non lancia: un problema con
 * l'email non annulla il cambiamento, che la pagina della classe mostra.
 */
async function avvisaDocente(
  p: PrenotazioneClasse,
  motivo: MotivoEmailClasse,
  opzioni: { giornataAnnullata?: string; prenotazioneCancellata?: boolean } = {},
): Promise<boolean> {
  const resend = resendOppureNull();
  if (!resend) {
    console.error(`Gestione classe ${p.id}: RESEND_API_KEY mancante, email "${motivo}" non inviata.`);
    return false;
  }
  const esito = await inviaEmailClasse(resend, p, motivo, opzioni);
  if (!esito.ok) console.error(`Gestione classe ${p.id}: email "${motivo}" non inviata:`, esito.errore);
  return esito.ok;
}

/** La prenotazione riletta dopo un cambiamento; se la rilettura non riesce, quella che si ha. */
async function riletta(client: SupabaseClient, p: PrenotazioneClasse): Promise<PrenotazioneClasse> {
  try {
    return (await caricaClasse(client, { id: p.id })) ?? p;
  } catch (err) {
    console.error(`Gestione classe ${p.id}: rilettura non riuscita:`, err instanceof Error ? err.message : err);
    return p;
  }
}

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
  if ((azione === "annulla" || azione === "aggiungi") && !sessionBySlug(giornata)) {
    return errore(400, "Giornata non valida. Ricarica la pagina e riprova.");
  }

  if (ARCHIVE_MODE && azione !== "reinvia") {
    return errore(410, "L'evento si è concluso: la prenotazione non si può più modificare.");
  }

  const ip = indirizzo(request);
  if (troppiTentativi(ip, adesso)) {
    return errore(429, "Troppi tentativi in poco tempo. Riprova tra qualche minuto.");
  }

  const codice = pulisciCodiceClasse(typeof body.codice === "string" ? body.codice : "");
  if (!codice) {
    registraTentativo(ip, adesso);
    return errore(404, NON_TROVATA);
  }

  const client = eventoAdminClient();
  if (!client) {
    console.error("Gestione classe: configurazione Supabase mancante (URL o service role).");
    return errore(503, "Il servizio non è disponibile in questo momento. Riprova tra qualche minuto.");
  }

  let p: PrenotazioneClasse | null;
  try {
    p = await caricaClasse(client, { codice });
  } catch (err) {
    console.error("Gestione classe: lettura non riuscita:", err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
  if (!p) {
    registraTentativo(ip, adesso);
    return errore(404, NON_TROVATA);
  }

  try {
    switch (azione) {
      case "aggiorna":
        return await aggiorna(client, p, body, adesso);
      case "annulla":
        return await annulla(client, p, giornata, adesso);
      case "aggiungi":
        return await aggiungi(client, p, giornata, adesso);
      case "reinvia":
        return await reinvia(p, adesso);
    }
  } catch (err) {
    console.error(`Gestione classe ${p.id} (${azione}): errore inatteso:`, err instanceof Error ? err.message : err);
    return errore(500, ERRORE_GENERICO);
  }
}

/* ── aggiorna ────────────────────────────────────────────────────────── */

async function aggiorna(client: SupabaseClient, p: PrenotazioneClasse, body: Record<string, unknown>, adesso: number) {
  const studenti = intero(body.studenti);
  const accompagnatori = intero(body.accompagnatori);

  // Le stesse regole e le stesse parole del modulo (lib/eventi/classi.ts): si
  // controllano i due numeri su una prenotazione per il resto valida.
  const invalido = validaPrenotazioneClasse(
    {
      istituto: "Istituto",
      comune: "",
      classe: "1A",
      docente_nome: "Nome",
      docente_cognome: "Cognome",
      docente_email: "nome@esempio.it",
      docente_telefono: "099 000000",
      studenti,
      accompagnatori,
      note: "",
      giornate: [SESSIONS[0].slug],
      consenso_privacy: true,
    },
    SESSIONS.map((s) => s.slug as string),
  );
  if (invalido) return errore(400, invalido.error, invalido.campo ? { campo: invalido.campo } : {});

  // Quando tutte le giornate della classe sono iniziate, i numeri non
  // servono più a niente se non a confondere chi è alla porta.
  const future = p.giornate.filter((g) => sessionBySlug(g.slug) && !iniziata(g.slug, adesso));
  if (future.length === 0) {
    return errore(409, `Le giornate della classe sono già iniziate: i numeri non si cambiano più da qui. ${AIUTO}`);
  }

  if (studenti === p.studenti && accompagnatori === p.accompagnatori) {
    return NextResponse.json({ success: true, posti_prima: p.posti, posti_dopo: p.posti, invariato: true, emailInviata: false });
  }

  const resend = resendOppureNull();
  // Le giornate già iniziate non si controllano: la sera del 10 una classe
  // può crescere per l'11 anche se il 10 era pieno.
  const salta = p.giornate.map((g) => g.slug).filter((slug) => iniziata(slug, adesso));
  const esito = await aggiornaNumeriClasse(client, resend, p, { studenti, accompagnatori }, { promuovi: false, salta });
  if (!esito.ok) {
    if (!esito.giornata) return errore(404, NON_TROVATA);
    const dopo = studenti + accompagnatori;
    // Tutte le giornate in cui non ci sta: abbassando i numeri per una sola,
    // il docente verrebbe poi fermato dall'altra.
    const piene = esito.giornate.length ? esito.giornate : [esito.giornata];
    const conArt = giornateConArticolo(piene) || "una delle giornate";
    console.info(`Gestione classe ${p.id}: numeri non cambiati, ${dopo} posti non ci stanno (${piene.join(", ")}).`);
    return errore(
      409,
      `Per ${conArt} i posti per le classi non bastano per ${dopo} persone: la prenotazione resta per ${p.posti} persone. Puoi indicare meno persone, oppure scrivi a info@bioergotech.org.`,
      { giornata: esito.giornata, giornate: piene },
    );
  }

  // Meno persone: i posti liberati nelle giornate confermate passano a chi
  // aspetta, e nelle giornate in lista d'attesa la classe, più piccola, può
  // ora starci. Solo per le giornate non ancora iniziate: in una giornata in
  // corso la classe può essere già entrata con i numeri di prima, e i posti
  // che lascia li assegna lo staff, non un'email automatica a metà mattina.
  if (esito.posti_dopo < esito.posti_prima) {
    await passaIPosti(
      client,
      resend,
      giornateDaRivedereDopoRiduzione(p).filter((slug) => !iniziata(slug, adesso)),
      p.id,
    );
  }

  const emailInviata = await avvisaDocente(await riletta(client, p), "aggiornamento");
  return NextResponse.json({ success: true, posti_prima: esito.posti_prima, posti_dopo: esito.posti_dopo, emailInviata });
}

/* ── annulla ─────────────────────────────────────────────────────────── */

async function annulla(client: SupabaseClient, p: PrenotazioneClasse, slug: string, adesso: number) {
  const conArt = giornateConArticolo([slug]);
  const g = p.giornate.find((x) => x.slug === slug);
  if (!g) {
    // Già tolta (un doppio clic, un'altra scheda): niente da fare.
    return NextResponse.json({ success: true, prenotazioneCancellata: false, era: null, invariato: true, emailInviata: false });
  }
  if (g.presenti !== null) {
    return errore(409, `L'ingresso della classe per ${conArt} è già registrato: la giornata non si può più togliere. ${AIUTO}`);
  }
  if (iniziata(slug, adesso)) {
    return errore(409, `La giornata ${dellaGiornata(slug)} è già iniziata: da qui non si può più togliere. ${AIUTO}`);
  }

  const resend = resendOppureNull();
  const esito = await annullaGiornataClasse(client, resend, p, slug, { promuovi: false });
  if (!esito.tolta) {
    // Tolta un attimo fa da un'altra richiesta: quella ha già avvisato il docente.
    return NextResponse.json({ success: true, prenotazioneCancellata: false, era: null, invariato: true, emailInviata: false });
  }

  if (esito.era === "confermato") await passaIPosti(client, resend, [slug], p.id);

  // Senza giornate la prenotazione per il docente non c'è più, anche se la
  // riga vuota non si è cancellata (resta nel log e nel pannello).
  const cancellata = esito.prenotazioneCancellata || esito.rimaste === 0;

  // L'avviso al docente: con i dati in memoria se la prenotazione non c'è più.
  const senzaQuesta = { ...p, giornate: p.giornate.filter((x) => x.slug !== slug) };
  const perEmail = cancellata ? senzaQuesta : await riletta(client, senzaQuesta);
  const emailInviata = await avvisaDocente(perEmail, "annullamento", {
    giornataAnnullata: slug,
    prenotazioneCancellata: cancellata,
  });

  return NextResponse.json({ success: true, prenotazioneCancellata: cancellata, era: esito.era, emailInviata });
}

/* ── aggiungi ────────────────────────────────────────────────────────── */

async function aggiungi(client: SupabaseClient, p: PrenotazioneClasse, slug: string, adesso: number) {
  const conArt = giornateConArticolo([slug]);
  const gia = p.giornate.find((x) => x.slug === slug);
  if (gia) {
    return NextResponse.json({ success: true, status: gia.status, invariato: true, emailInviata: false });
  }
  if (iniziata(slug, adesso)) {
    return errore(409, `La giornata ${dellaGiornata(slug)} è già iniziata: da qui non si può più aggiungere. ${AIUTO}`);
  }

  // La giornata esiste nel database? Senza, l'RPC fallirebbe: meglio dirlo chiaro.
  const { data: sess, error: sessError } = await client.from("event_sessions").select("id").eq("slug", slug).maybeSingle();
  if (sessError || !sess) {
    console.error(
      `GESTIONE CLASSE BLOCCATA: la giornata ${slug} non è in event_sessions` +
        (sessError ? ` (${sessError.code ?? "?"} ${sessError.message ?? ""})` : "") +
        ". Esegui supabase/migrations/20261231300000_event_giorno1_ripristino.sql.",
    );
    return errore(503, `In questo momento non riusciamo ad aggiungere ${conArt}. Riprova tra qualche minuto o scrivi a info@bioergotech.org.`);
  }

  // Con i dati salvati: l'RPC ritrova la stessa prenotazione (docente, scuola
  // e classe) e aggiunge solo la giornata. Numeri e codice non cambiano.
  let esito: EsitoPrenotazione;
  try {
    esito = await prenotaClasse(client, {
      istituto: p.istituto,
      comune: p.comune ?? "",
      classe: p.classe,
      docente_nome: p.docente_nome,
      docente_cognome: p.docente_cognome,
      docente_email: p.docente_email,
      docente_telefono: p.docente_telefono,
      studenti: p.studenti,
      accompagnatori: p.accompagnatori,
      note: p.note ?? "",
      giornate: [slug],
      consenso_privacy: true,
      licei_adesione_id: p.licei_adesione_id,
      privacy_testo: CONSENSO_PRIVACY_CLASSI_TESTO,
    });
  } catch (err) {
    console.error(`Gestione classe ${p.id}: giornata ${slug} non aggiunta:`, err instanceof Error ? err.message : err);
    return errore(500, `Non siamo riusciti ad aggiungere ${conArt}. Riprova o scrivi a info@bioergotech.org.`);
  }

  const tornata = esito.giornate.find((x) => x.slug === slug);
  if (!tornata) {
    console.error(`GESTIONE CLASSE INCOMPLETA: prenotazione ${p.id}, richiesta ${slug}, non tornata dall'RPC.`);
    return errore(500, `Non siamo riusciti ad aggiungere ${conArt}. Riprova o scrivi a info@bioergotech.org.`);
  }

  if (esito.prenotazione.id !== p.id) {
    // La prenotazione è stata annullata un attimo prima (un'altra scheda):
    // l'RPC ne ha creata una nuova, con un codice nuovo. Il docente lo
    // riceve per email, l'unico posto dove si vede il codice.
    console.error(
      `Gestione classe ${p.id}: prenotazione annullata nel frattempo, la giornata ${slug} è finita nella nuova prenotazione ${esito.prenotazione.id}.`,
    );
    const emailInviata = await avvisaDocente(esito.prenotazione, "prenotazione");
    return NextResponse.json({ success: true, status: tornata.status, emailInviata });
  }

  console.info(`Gestione classe ${p.id}: giornata ${slug} aggiunta (${tornata.status}).`);
  const emailInviata = await avvisaDocente(esito.prenotazione, "aggiornamento");
  return NextResponse.json({ success: true, status: tornata.status, emailInviata });
}

/* ── reinvia ─────────────────────────────────────────────────────────── */

const rispostaReinvio = (inviata: boolean) =>
  inviata
    ? NextResponse.json({ success: true })
    : errore(500, "Non siamo riusciti a inviare l'email. Riprova tra qualche minuto o scrivi a info@bioergotech.org.");

async function reinvia(p: PrenotazioneClasse, adesso: number) {
  // Un clic di pochi istanti fa sta ancora mandando l'email: si aspetta
  // quell'invio e se ne riporta l'esito vero.
  const inCorso = reinvioInCorso.get(p.id);
  if (inCorso) {
    const inviata = await inCorso;
    console.info(`Gestione classe ${p.id}: reinvio già in partenza, non ripartito (${inviata ? "inviato" : "non inviato"}).`);
    return rispostaReinvio(inviata);
  }

  const ultimo = ultimoReinvio.get(p.id);
  if (ultimo && adesso - ultimo < ATTESA_REINVIO_MS) {
    const secondi = Math.ceil((ATTESA_REINVIO_MS - (adesso - ultimo)) / 1000);
    return errore(
      429,
      "Ti abbiamo appena rimandato l'email. Controlla la posta, anche nella cartella spam o Promozioni; se non arriva, riprova tra un paio di minuti.",
      { riprovaTra: secondi },
    );
  }
  const resend = resendOppureNull();
  if (!resend) {
    console.error(`Gestione classe ${p.id}: RESEND_API_KEY mancante, reinvio impossibile.`);
    return errore(503, "L'invio delle email non è disponibile in questo momento. Riprova più tardi o scrivi a info@bioergotech.org.");
  }

  // L'invio si segna in corso subito, così due clic ravvicinati non mandano
  // due email; l'attesa di due minuti parte solo da un invio riuscito.
  const invio: Promise<boolean> = inviaEmailClasse(resend, p, "reinvio")
    .then((esito) => {
      if (esito.ok) {
        ultimoReinvio.set(p.id, Date.now());
        return true;
      }
      console.error(`Gestione classe ${p.id}: reinvio non riuscito:`, esito.errore);
      return false;
    })
    .catch((err: unknown) => {
      console.error(`Gestione classe ${p.id}: reinvio non riuscito:`, err instanceof Error ? err.message : err);
      return false;
    })
    .finally(() => {
      if (reinvioInCorso.get(p.id) === invio) reinvioInCorso.delete(p.id);
    });
  reinvioInCorso.set(p.id, invio);
  return rispostaReinvio(await invio);
}
