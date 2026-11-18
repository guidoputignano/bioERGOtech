import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import {
  MAX_ACCOMPAGNATORI,
  MAX_PERSONE_CLASSE,
  MIN_ACCOMPAGNATORI,
  type PrenotazioneClasse,
} from "@/lib/eventi/classi";
import {
  aggiornaNumeriClasse,
  annullaGiornataClasse,
  caricaClasse,
  giornateDaRivedereDopoRiduzione,
  inviaEmailClasse,
  promuoviDopoPostiLiberati,
} from "@/lib/eventi/classi-server";
import type { MotivoEmailClasse } from "@/lib/eventi/email-classi";
import type { EsitoInvio } from "@/lib/eventi/evento-server";
import { giornateConArticolo, sessionBySlug } from "@/app/eventi/vivere-piu-a-lungo/content";
import {
  caricaDatiClassi,
  giornateClassi,
  mancaNelDatabase,
  postiOccupatiGiornata,
} from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloDati";
import type { RispostaClassi } from "@/app/eventi/vivere-piu-a-lungo/admin/PannelloComune";

export const dynamic = "force-dynamic";
/** Alzare la quota o togliere una classe può confermare altre classi, ognuna con la sua email. */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NESSUNA_CACHE = { "Cache-Control": "no-store" };
const LOG = "[eventi/admin/classi]";

const MANCA_RESEND =
  "Invio email non configurato: sul server manca RESEND_API_KEY. Avvisa il docente a mano o chiedi di configurare la chiave.";

/** L'esito dell'email al docente, come lo legge il pannello. */
type EsitoEmail = { inviata: true; a: string } | { inviata: false; a: string; errore: string };

const errore = (messaggio: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: messaggio, ...extra }, { status, headers: NESSUNA_CACHE });

const ok = (corpo: Record<string, unknown>) => NextResponse.json({ ok: true, ...corpo }, { headers: NESSUNA_CACHE });

const numero = (n: number) => n.toLocaleString("it-IT");
const maiuscola = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
/** "il 10 dicembre", "l'11 dicembre"; per una sessione sconosciuta, il suo codice. */
const conArticolo = (slug: string) => giornateConArticolo([slug]) || `la sessione "${slug || "senza nome"}"`;
/** "la 4B del Liceo Archita": nei messaggi allo staff. */
const laClasse = (p: Pick<PrenotazioneClasse, "classe" | "istituto">) => `la ${p.classe.trim()} (${p.istituto.trim()})`;

const giornataConclusa = (slug: string) => {
  const s = sessionBySlug(slug);
  return !s || Date.now() > Date.parse(s.fineISO);
};

const resendOppureNull = () => (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

/** Un intero dal corpo della richiesta, o NaN. */
const intero = (v: unknown): number => {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^\s*\d{1,6}\s*$/.test(v)) return Number(v.trim());
  return Number.NaN;
};

/** L'email al docente, con l'esito in parole per il pannello. Non lancia. */
async function mandaEmail(
  p: PrenotazioneClasse,
  motivo: MotivoEmailClasse,
  opzioni?: { giornataLiberata?: string; giornataAnnullata?: string; prenotazioneCancellata?: boolean },
): Promise<EsitoEmail> {
  const resend = resendOppureNull();
  if (!resend) return { inviata: false, a: p.docente_email, errore: MANCA_RESEND };
  const esito = await inviaEmailClasse(resend, p, motivo, opzioni);
  if (esito.ok) return { inviata: true, a: p.docente_email };
  console.error(`${LOG} prenotazione ${p.id}: email ${motivo} non partita:`, esito.errore);
  return { inviata: false, a: p.docente_email, errore: `L'email al docente non è partita (${esito.errore}).` };
}

/** Le classi e le persone confermate dalla lista d'attesa, in una frase per lo staff. */
function testoPromozioni(r: {
  classi: { prenotazione: PrenotazioneClasse; email: EsitoInvio | null }[];
  persone: number;
}): { testo: string; attenzione: boolean } {
  const parti: string[] = [];
  let attenzione = false;
  if (r.classi.length > 0) {
    const nomi = r.classi.map((c) => `${c.prenotazione.classe} (${c.prenotazione.istituto})`).join(", ");
    parti.push(
      r.classi.length === 1
        ? `Confermata dalla lista d'attesa la classe ${nomi}.`
        : `Confermate dalla lista d'attesa ${r.classi.length} classi: ${nomi}.`,
    );
    const senza = r.classi.filter((c) => !c.email?.ok);
    if (senza.length > 0) {
      attenzione = true;
      const chi = senza.map((c) => `${c.prenotazione.classe} (${c.prenotazione.istituto})`).join(", ");
      parti.push(
        `Attenzione: l'email non è partita per ${chi}${
          senza.some((c) => c.email === null) ? ", perché sul server manca RESEND_API_KEY" : ""
        }. Reinviala dalla scheda della classe o avvisa il docente a mano.`,
      );
    } else {
      parti.push(r.classi.length === 1 ? "Il docente ha ricevuto l'email." : "Ogni docente ha ricevuto l'email.");
    }
  }
  if (r.persone > 0) {
    parti.push(
      `${r.persone === 1 ? "Confermata 1 persona" : `Confermate ${numero(r.persone)} persone`} dalla lista d'attesa delle iscrizioni singole: il biglietto parte per email (un invio non riuscito compare nei log).`,
    );
  }
  return { testo: parti.join(" "), attenzione };
}

/** Dopo che una giornata ha liberato posti: prima le classi, poi le persone. Non lancia. */
async function passaIPosti(slug: string, client: SupabaseClient) {
  if (giornataConclusa(slug)) return { testo: "", attenzione: false };
  const esito = await promuoviDopoPostiLiberati(client, resendOppureNull(), slug);
  return testoPromozioni(esito);
}

type Ponte = {
  id: string;
  booking_id: string;
  session_id: string;
  is_waitlist: boolean;
  settore: string | null;
  presenti: number | null;
  slug: string;
  capienza: number | null;
  quota: number | null;
  posti: number;
};

/** Una giornata di una classe con la sua sessione e i posti della classe. Null se non c'è. */
async function leggiPonte(client: SupabaseClient, id: string): Promise<Ponte | null> {
  const { data, error } = await client
    .from("event_group_booking_sessions")
    .select(
      "id, booking_id, session_id, is_waitlist, settore, presenti, event_sessions ( slug, capienza_max, quota_gruppi ), event_group_bookings ( posti )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`event_group_booking_sessions: ${error.code ?? "?"} ${error.message}`);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const s = Array.isArray(r.event_sessions) ? r.event_sessions[0] : r.event_sessions;
  const b = Array.isArray(r.event_group_bookings) ? r.event_group_bookings[0] : r.event_group_bookings;
  return {
    id: String(r.id),
    booking_id: String(r.booking_id),
    session_id: String(r.session_id),
    is_waitlist: Boolean(r.is_waitlist),
    settore: typeof r.settore === "string" && r.settore.trim() ? r.settore : null,
    presenti: r.presenti === null || r.presenti === undefined ? null : Number(r.presenti),
    slug: String(s?.slug ?? ""),
    capienza: s?.capienza_max == null ? null : Number(s.capienza_max),
    quota: s?.quota_gruppi == null ? null : Number(s.quota_gruppi),
    posti: Number(b?.posti ?? 0),
  };
}

/**
 * Se una classe di `posti` persone ci sta in una giornata: nella capienza
 * (event_posti_occupati, persone e classi) e nella quota delle scuole.
 * `giaDentro` sono i posti che la classe occupa già (per un cambio di numeri).
 * Torna null se ci sta, altrimenti il motivo in parole.
 */
async function nonCiSta(
  client: SupabaseClient,
  sessione: { id: string; slug: string; capienza: number | null; quota: number | null },
  posti: number,
  giaDentro = 0,
): Promise<string | null> {
  const { occupati, postiClassi } = await postiOccupatiGiornata(client, sessione.id);
  const art = conArticolo(sessione.slug);
  if (sessione.capienza !== null && occupati - giaDentro + posti > sessione.capienza) {
    return `${maiuscola(art)} è al completo: ${numero(occupati)} posti occupati su ${numero(sessione.capienza)}, e la classe ne occupa ${numero(posti)}.`;
  }
  if (sessione.quota !== null && postiClassi - giaDentro + posti > sessione.quota) {
    return `${maiuscola(art)} i posti per le classi sono esauriti: le classi confermate ne occupano ${numero(postiClassi)} su una quota di ${numero(sessione.quota)}, e la classe ne occupa ${numero(posti)}.`;
  }
  return null;
}

/* ── GET: l'elenco e i numeri per giornata ──────────────────────────────── */

/**
 * Le prenotazioni per classe, per la scheda Classi del pannello: tutte, con
 * le giornate, il settore, gli ingressi e la posizione in lista d'attesa, e
 * per ogni giornata i posti delle classi (event_group_seats), la quota e gli
 * ingressi. Solo staff (requireAdmin): contiene i contatti dei docenti.
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return errore(error ?? "Accesso negato.", status);

  try {
    const dati = await caricaDatiClassi(client);
    const corpo: RispostaClassi = {
      disponibili: dati.disponibili,
      classi: dati.classi,
      giornate: giornateClassi(dati),
      generato_at: new Date().toISOString(),
    };
    return NextResponse.json(corpo, { headers: NESSUNA_CACHE });
  } catch (err) {
    console.error(`${LOG} lettura:`, err instanceof Error ? err.message : err);
    return errore("Non riesco a leggere le classi dal database: i numeri non sono disponibili. Riprova tra poco.", 500);
  }
}

/* ── POST: le azioni dello staff ────────────────────────────────────────── */

/**
 * Le azioni dello staff sulle classi. Ognuna scrive nei log che cosa ha
 * fatto (senza dati personali: "prenotazione <id>") e torna un messaggio
 * chiaro; ogni email al docente dice com'è andata.
 *
 * - `quota` { giornata, quota: numero | null }: i posti per le classi di una
 *   giornata. Se la quota sale, le classi in lista d'attesa che ora ci stanno
 *   vengono confermate (in ordine di prenotazione) e ricevono l'email.
 * - `settore` { bridge_id, settore, avvisa }: il settore di una classe in
 *   una giornata ("" lo toglie). Con `avvisa` il docente riceve l'email aggiornata.
 * - `numeri` { booking_id, studenti, accompagnatori, avvisa, forza? }: se
 *   aumentano e in una giornata confermata non ci stanno, 409 "pieno"; con
 *   `forza` si salvano lo stesso. Se diminuiscono, i posti passano a chi aspetta.
 * - `conferma` { bridge_id, forza? }: conferma una classe in lista d'attesa.
 *   Oltre la capienza o la quota, 409 "pieno"; con `forza` si conferma lo
 *   stesso. Il docente riceve sempre l'email.
 * - `rimuovi_giornata` { bridge_id, avvisa }: toglie la giornata; se era
 *   l'ultima, la prenotazione è cancellata. I posti passano a chi aspetta.
 * - `reinvia` { booking_id }: rimanda l'email della classe al docente.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return errore(error ?? "Accesso negato.", status);

  let body: Record<string, unknown>;
  try {
    const letto = await request.json();
    if (!letto || typeof letto !== "object") throw new Error("corpo");
    body = letto as Record<string, unknown>;
  } catch {
    return errore("Richiesta non valida.", 400);
  }
  const azione = typeof body.azione === "string" ? body.azione : "";

  try {
    switch (azione) {
      case "quota":
        return await azioneQuota(client, body);
      case "settore":
        return await azioneSettore(client, body);
      case "numeri":
        return await azioneNumeri(client, body);
      case "conferma":
        return await azioneConferma(client, body);
      case "rimuovi_giornata":
        return await azioneRimuovi(client, body);
      case "reinvia":
        return await azioneReinvia(client, body);
      default:
        return errore("Azione sconosciuta.", 400);
    }
  } catch (err) {
    console.error(`${LOG} ${azione}:`, err instanceof Error ? err.message : err);
    return errore(
      "Il database non ha risposto: l'operazione potrebbe non essere stata completata. Aggiorna l'elenco e controlla.",
      500,
    );
  }
}

/* ── La quota delle scuole ── */

async function azioneQuota(client: SupabaseClient, body: Record<string, unknown>) {
  const slug = typeof body.giornata === "string" ? body.giornata : "";
  if (!sessionBySlug(slug)) return errore("Giornata non valida.", 400);
  let quota: number | null;
  if (body.quota === null) quota = null;
  else {
    quota = intero(body.quota);
    if (!Number.isInteger(quota) || quota < 0 || quota > 100_000) {
      return errore("Scrivi la quota come numero intero di posti, da 0 in su, oppure scegli nessun limite.", 400);
    }
  }

  const { data: prima, error: erroreLettura } = await client
    .from("event_sessions")
    .select("id, capienza_max, quota_gruppi")
    .eq("slug", slug)
    .maybeSingle();
  if (erroreLettura) {
    if (mancaNelDatabase(erroreLettura) || erroreLettura.code === "42703") {
      return errore("La quota delle scuole non è nel database: va eseguito il file delle prenotazioni per classe.", 503);
    }
    throw new Error(`event_sessions: ${erroreLettura.message}`);
  }
  const art = conArticolo(slug);
  if (!prima) return errore(`${maiuscola(art)} non esiste nel database: la quota non si può salvare.`, 409);
  const quotaPrima = prima.quota_gruppi == null ? null : Number(prima.quota_gruppi);
  if (quotaPrima === quota) {
    return ok({ gia: true, messaggio: `La quota ${giornataDi(slug)} era già ${descriviQuota(quota)}.` });
  }

  const { data: salvate, error: erroreScrittura } = await client
    .from("event_sessions")
    .update({ quota_gruppi: quota })
    .eq("slug", slug)
    .select("id");
  if (erroreScrittura) throw new Error(`event_sessions: ${erroreScrittura.message}`);
  if (!salvate || salvate.length === 0) return errore("La quota non è stata salvata: aggiorna e riprova.", 409);
  console.info(`${LOG} quota ${slug}: da ${quotaPrima ?? "nessun limite"} a ${quota ?? "nessun limite"}.`);

  const parti = [`Quota ${giornataDi(slug)} salvata: ${descriviQuota(quota)} (prima ${descriviQuota(quotaPrima)}).`];
  let attenzione = false;

  // Sotto i posti già confermati: nessuna classe perde il posto, ma non se ne confermano altre.
  if (quota !== null) {
    const { postiClassi } = await postiOccupatiGiornata(client, String(prima.id));
    if (postiClassi > quota) {
      attenzione = true;
      parti.push(
        `Le classi confermate occupano già ${numero(postiClassi)} posti: nessuna perde il posto, ma non se ne confermano altre finché non si scende sotto la quota.`,
      );
    }
    if (quota > Number(prima.capienza_max)) {
      parti.push(`La quota supera la capienza della giornata (${numero(Number(prima.capienza_max))}): conta comunque la capienza.`);
    }
  }

  // Più posti per le classi: chi aspetta e ora ci sta entra, in ordine di prenotazione.
  const sale = quotaPrima !== null && (quota === null || quota > quotaPrima);
  if (sale) {
    const promozioni = await passaIPosti(slug, client);
    if (promozioni.testo) parti.push(promozioni.testo);
    attenzione = attenzione || promozioni.attenzione;
  }
  return ok({ messaggio: parti.join(" "), attenzione: attenzione || undefined });
}

/** "del 10 dicembre", "dell'11 dicembre". */
function giornataDi(slug: string): string {
  const art = conArticolo(slug);
  return art.startsWith("l'") ? `dell'${art.slice(2)}` : art.startsWith("il ") ? `del ${art.slice(3)}` : `di ${art}`;
}

const descriviQuota = (q: number | null) => (q === null ? "nessun limite oltre la capienza" : `${numero(q)} posti`);

/* ── Il settore ── */

async function azioneSettore(client: SupabaseClient, body: Record<string, unknown>) {
  const bridgeId = typeof body.bridge_id === "string" ? body.bridge_id : "";
  if (!UUID.test(bridgeId)) return errore("Parametri non validi.", 400);
  const grezzo = typeof body.settore === "string" ? body.settore : "";
  const settore = grezzo.replace(/\s+/g, " ").trim();
  if (settore.length > 80) return errore("Il settore è troppo lungo: al massimo 80 caratteri.", 400);
  const avvisa = body.avvisa === true;

  const ponte = await leggiPonte(client, bridgeId);
  if (!ponte) return errore("Questa giornata non risulta più nella prenotazione: aggiorna l'elenco.", 404);
  const art = conArticolo(ponte.slug);
  if ((ponte.settore ?? "") === settore) {
    return ok({ gia: true, messaggio: settore ? `Il settore per ${art} era già «${settore}».` : `Per ${art} non c'era nessun settore.` });
  }

  const { data: salvate, error: erroreScrittura } = await client
    .from("event_group_booking_sessions")
    .update({ settore: settore || null })
    .eq("id", bridgeId)
    .select("id");
  if (erroreScrittura) throw new Error(`settore: ${erroreScrittura.message}`);
  if (!salvate || salvate.length === 0) return errore("Questa giornata non risulta più nella prenotazione: aggiorna l'elenco.", 404);
  console.info(`${LOG} prenotazione ${ponte.booking_id}: settore ${ponte.slug} ${settore ? "assegnato" : "tolto"}.`);

  const base = settore ? `Settore per ${art} salvato: «${settore}».` : `Settore per ${art} tolto.`;
  if (!avvisa) return ok({ messaggio: `${base} Il docente non è stato avvisato.`, email: null });

  const p = await caricaClasse(client, { id: ponte.booking_id });
  if (!p) return ok({ messaggio: `${base} La prenotazione non si rilegge più: l'email non è partita.`, attenzione: true, email: null });
  const email = await mandaEmail(p, "aggiornamento");
  return ok({ messaggio: base, email });
}

/* ── I numeri ── */

async function azioneNumeri(client: SupabaseClient, body: Record<string, unknown>) {
  const bookingId = typeof body.booking_id === "string" ? body.booking_id : "";
  if (!UUID.test(bookingId)) return errore("Parametri non validi.", 400);
  const studenti = intero(body.studenti);
  const accompagnatori = intero(body.accompagnatori);
  if (!Number.isInteger(studenti) || studenti < 1) return errore("Indica quanti studenti vengono, almeno 1.", 400, { campo: "studenti" });
  if (!Number.isInteger(accompagnatori) || accompagnatori < MIN_ACCOMPAGNATORI || accompagnatori > MAX_ACCOMPAGNATORI) {
    return errore(`I docenti vanno da ${MIN_ACCOMPAGNATORI} a ${MAX_ACCOMPAGNATORI}.`, 400, { campo: "accompagnatori" });
  }
  if (studenti + accompagnatori > MAX_PERSONE_CLASSE) {
    return errore(`Una prenotazione è per al massimo ${MAX_PERSONE_CLASSE} persone, docenti compresi.`, 400, { campo: "studenti" });
  }
  const forza = body.forza === true;
  const avvisa = body.avvisa === true;

  const p = await caricaClasse(client, { id: bookingId });
  if (!p) return errore("Prenotazione non trovata: forse è stata annullata. Aggiorna l'elenco.", 404);
  if (p.studenti === studenti && p.accompagnatori === accompagnatori) {
    return ok({ gia: true, messaggio: "I numeri erano già questi: niente da cambiare." });
  }

  const dopo = studenti + accompagnatori;
  let forzato = false;
  const r = await aggiornaNumeriClasse(client, null, p, { studenti, accompagnatori }, { promuovi: false });
  if (!r.ok) {
    if (r.giornata === null) return errore("Prenotazione non trovata: forse è stata annullata. Aggiorna l'elenco.", 404);
    // Il motivo preciso, con i numeri della giornata che non basta.
    const { data: s } = await client
      .from("event_sessions")
      .select("id, slug, capienza_max, quota_gruppi")
      .eq("slug", r.giornata)
      .maybeSingle();
    const motivo = s
      ? await nonCiSta(
          client,
          { id: String(s.id), slug: String(s.slug), capienza: Number(s.capienza_max), quota: s.quota_gruppi == null ? null : Number(s.quota_gruppi) },
          dopo,
          p.posti,
        )
      : null;
    const testo = `Con ${numero(dopo)} persone la classe non ci sta ${conArticolo(r.giornata)}.${motivo ? ` ${motivo}` : ""}`;
    if (!forza) return errore(testo, 409, { codice: "pieno", giornata: r.giornata });

    // Lo staff ha verificato che c'è spazio: si salva senza il controllo dei
    // posti. I limiti della tabella (1 a 40 studenti, 1 a 10 docenti, 40 in
    // tutto) valgono comunque.
    const { data: salvate, error: erroreScrittura } = await client
      .from("event_group_bookings")
      .update({ studenti, accompagnatori, updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .select("id");
    if (erroreScrittura) throw new Error(`numeri forzati: ${erroreScrittura.message}`);
    if (!salvate || salvate.length === 0) return errore("Prenotazione non trovata: forse è stata annullata. Aggiorna l'elenco.", 404);
    forzato = true;
    console.warn(`${LOG} prenotazione ${p.id}: numeri forzati oltre i posti, da ${p.posti} a ${dopo}.`);
  } else {
    console.info(`${LOG} prenotazione ${p.id}: numeri cambiati, da ${p.posti} a ${dopo}.`);
  }

  const parti = [
    `Numeri salvati: ${studenti} ${studenti === 1 ? "studente" : "studenti"} e ${accompagnatori} ${accompagnatori === 1 ? "docente" : "docenti"}, ${numero(dopo)} persone in tutto (prima ${numero(p.posti)}).`,
  ];
  if (forzato) parti.push("Salvati oltre i posti disponibili, come hai confermato.");
  let attenzione = false;

  // Meno persone: i posti liberati, giornata per giornata, a chi aspetta.
  // Anche le giornate in cui la classe stessa è in lista d'attesa: più
  // piccola, ora può starci, e senza una nuova conferma resterebbe in attesa.
  if (dopo < p.posti) {
    for (const slug of giornateDaRivedereDopoRiduzione(p)) {
      const promozioni = await passaIPosti(slug, client);
      if (promozioni.testo) parti.push(`${maiuscola(conArticolo(slug))}: ${promozioni.testo}`);
      attenzione = attenzione || promozioni.attenzione;
    }
  }

  if (!avvisa) {
    parti.push("Il docente non è stato avvisato.");
    return ok({ messaggio: parti.join(" "), attenzione: attenzione || undefined, email: null });
  }
  const aggiornata = await caricaClasse(client, { id: p.id });
  if (!aggiornata) {
    parti.push("La prenotazione non si rilegge più: l'email non è partita.");
    return ok({ messaggio: parti.join(" "), attenzione: true, email: null });
  }
  const email = await mandaEmail(aggiornata, "aggiornamento");
  return ok({ messaggio: parti.join(" "), attenzione: attenzione || undefined, email });
}

/* ── Conferma dalla lista d'attesa ── */

async function azioneConferma(client: SupabaseClient, body: Record<string, unknown>) {
  const bridgeId = typeof body.bridge_id === "string" ? body.bridge_id : "";
  if (!UUID.test(bridgeId)) return errore("Parametri non validi.", 400);
  const forza = body.forza === true;

  const ponte = await leggiPonte(client, bridgeId);
  if (!ponte) return errore("Questa giornata non risulta più nella prenotazione: aggiorna l'elenco.", 404);
  const art = conArticolo(ponte.slug);
  if (!sessionBySlug(ponte.slug)) {
    return errore(`La sessione "${ponte.slug}" non è una giornata del sito: non si può confermare da qui.`, 409);
  }
  if (!ponte.is_waitlist) return ok({ gia: true, messaggio: `La classe era già confermata per ${art}.` });
  if (giornataConclusa(ponte.slug)) return errore(`${maiuscola(art)} è conclusa: non c'è più un posto da confermare.`, 409);

  const motivo = await nonCiSta(
    client,
    { id: ponte.session_id, slug: ponte.slug, capienza: ponte.capienza, quota: ponte.quota },
    ponte.posti,
  );
  if (motivo && !forza) return errore(motivo, 409, { codice: "pieno" });

  const { data: aggiornate, error: erroreScrittura } = await client
    .from("event_group_booking_sessions")
    .update({ is_waitlist: false })
    .eq("id", ponte.id)
    .eq("is_waitlist", true)
    .select("id");
  if (erroreScrittura) throw new Error(`conferma: ${erroreScrittura.message}`);
  if (!aggiornate || aggiornate.length === 0) {
    // Confermata un attimo prima (dalla lista d'attesa automatica, da un collega): nessuna seconda email.
    return ok({ gia: true, messaggio: `La classe era già confermata per ${art}.` });
  }
  console.info(`${LOG} prenotazione ${ponte.booking_id}: confermata dalla lista d'attesa per ${ponte.slug}${motivo ? ", oltre i posti" : ""}.`);

  const p = await caricaClasse(client, { id: ponte.booking_id });
  const base = motivo
    ? `Classe confermata per ${art}, oltre i posti disponibili, come hai confermato.`
    : `Classe confermata per ${art}.`;
  if (!p) return ok({ messaggio: `${base} La prenotazione non si rilegge più: l'email non è partita.`, attenzione: true, email: null });
  const email = await mandaEmail(p, "posto_liberato", { giornataLiberata: ponte.slug });
  return ok({ messaggio: base, email });
}

/* ── Togliere una giornata ── */

async function azioneRimuovi(client: SupabaseClient, body: Record<string, unknown>) {
  const bridgeId = typeof body.bridge_id === "string" ? body.bridge_id : "";
  if (!UUID.test(bridgeId)) return errore("Parametri non validi.", 400);
  const avvisa = body.avvisa === true;

  const ponte = await leggiPonte(client, bridgeId);
  if (!ponte) return errore("Questa giornata non risulta più nella prenotazione: aggiorna l'elenco.", 404);
  const p = await caricaClasse(client, { id: ponte.booking_id });
  if (!p) return errore("Prenotazione non trovata: forse è stata annullata. Aggiorna l'elenco.", 404);
  const art = conArticolo(ponte.slug);

  const r = await annullaGiornataClasse(client, null, p, ponte.slug, { promuovi: false });
  if (!r.tolta) return ok({ gia: true, messaggio: `${maiuscola(art)} era già stata tolta dalla prenotazione.` });
  console.info(`${LOG} prenotazione ${p.id}: giornata ${ponte.slug} tolta dallo staff (era ${r.era}).`);

  const cancellata = r.prenotazioneCancellata || r.rimaste === 0;
  const parti = [
    cancellata
      ? `Prenotazione di ${laClasse(p)} annullata: ${art} era la sua unica giornata.`
      : `Tolta ${art} dalla prenotazione di ${laClasse(p)}.`,
  ];
  let attenzione = false;
  if (r.rimaste === 0 && !r.prenotazioneCancellata) {
    attenzione = true;
    parti.push("La prenotazione, ora senza giornate, non si è cancellata: resta nell'elenco, ma non vale per nessuna giornata.");
  }

  // Prima i posti, poi l'email: chi aspetta non deve dipendere dall'email del docente.
  if (r.era === "confermato") {
    const promozioni = await passaIPosti(ponte.slug, client);
    if (promozioni.testo) parti.push(promozioni.testo);
    attenzione = attenzione || promozioni.attenzione;
  }

  if (!avvisa) {
    parti.push("Il docente non è stato avvisato.");
    return ok({ messaggio: parti.join(" "), eliminata: cancellata, attenzione: attenzione || undefined, email: null });
  }
  const email = await mandaEmail(p, "annullamento", { giornataAnnullata: ponte.slug, prenotazioneCancellata: cancellata });
  return ok({ messaggio: parti.join(" "), eliminata: cancellata, attenzione: attenzione || undefined, email });
}

/* ── Reinvio dell'email ── */

async function azioneReinvia(client: SupabaseClient, body: Record<string, unknown>) {
  const bookingId = typeof body.booking_id === "string" ? body.booking_id : "";
  if (!UUID.test(bookingId)) return errore("Parametri non validi.", 400);
  const p = await caricaClasse(client, { id: bookingId });
  if (!p) return errore("Prenotazione non trovata: forse è stata annullata. Aggiorna l'elenco.", 404);
  if (!p.giornate.some((g) => sessionBySlug(g.slug))) {
    return errore("Questa prenotazione non ha nessuna giornata: l'email sarebbe vuota.", 409);
  }
  if (!process.env.RESEND_API_KEY) return errore(MANCA_RESEND, 503);
  const email = await mandaEmail(p, "reinvio");
  if (!email.inviata) return errore(email.errore, 502);
  console.info(`${LOG} prenotazione ${p.id}: email reinviata dallo staff.`);
  return ok({ messaggio: "Email della classe reinviata.", email });
}
