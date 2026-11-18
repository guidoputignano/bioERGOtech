import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import {
  CAMPAGNE,
  campagnaValida,
  descriviEsito,
  inviaCampagna,
  inviaProva,
  vistaComunicazioni,
} from "@/lib/eventi/evento-comunicazioni";

export const dynamic = "force-dynamic";
/** L'invio a tutti va a blocchi da 100 con una pausa: per qualche migliaio di persone bastano pochi minuti. */
export const maxDuration = 300;

const NESSUNA_CACHE = { "Cache-Control": "no-store" };

const errore = (messaggio: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: messaggio, ...extra }, { status, headers: NESSUNA_CACHE });

/**
 * Le email a tutti, per la scheda Comunicazioni del pannello: agli iscritti
 * (biglietto aggiornato, promemoria) e alle scuole (promemoria alle classi,
 * invito alle scuole del percorso).
 *
 * GET: per ogni campagna lo stato (inviata quando e con che esito, oppure
 * programmata), a quanti partirebbe adesso, se è bloccata e perché, e le
 * anteprime con un esempio. Se gli iscritti o le scuole non si leggono, le
 * loro campagne risultano bloccate e le altre restano utilizzabili. Solo admin.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) return errore(guard.error, guard.status);

  try {
    const vista = await vistaComunicazioni(guard.client, { emailProva: guard.chiamante.email });
    return NextResponse.json(vista, { headers: NESSUNA_CACHE });
  } catch (err) {
    console.error("[eventi/admin/comunicazioni] lettura:", err instanceof Error ? err.message : err);
    return errore("Non riesco a leggere i dati dal database: lo stato delle email non è disponibile. Riprova tra poco.", 500);
  }
}

/**
 * POST { campagna: "biglietto_aggiornato" | "promemoria" | "promemoria_classi" | "invito_scuole",
 *        azione: "prova" | "invia", esempio? }
 *
 * - prova: la campagna con la persona di esempio scelta, all'indirizzo
 *   dell'admin collegato. Non conta come invio.
 * - invia: prenota la campagna e la manda a tutti, una volta sola. Una
 *   seconda richiesta (un altro clic, un collega, il cron) riceve 409.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return errore(guard.error, guard.status);
  const { client, chiamante } = guard;

  const body = (await request.json().catch(() => null)) as {
    campagna?: unknown;
    azione?: unknown;
    esempio?: unknown;
  } | null;
  if (!body || !campagnaValida(body.campagna)) return errore("Campagna non riconosciuta.", 400);
  if (body.azione !== "prova" && body.azione !== "invia") return errore("Azione non riconosciuta.", 400);
  const campagna = body.campagna;

  const chiaveResend = process.env.RESEND_API_KEY;
  if (!chiaveResend) {
    return errore(
      "L'invio delle email non è configurato su questo ambiente: manca la variabile RESEND_API_KEY.",
      503,
    );
  }
  const resend = new Resend(chiaveResend);

  if (body.azione === "prova") {
    const a = (chiamante.email ?? "").trim();
    if (!a) return errore("Il tuo account non ha un indirizzo email: la prova non ha dove arrivare.", 400);
    const r = await inviaProva(client, resend, campagna, {
      a,
      esempio: typeof body.esempio === "string" ? body.esempio : undefined,
    });
    if (!r.ok) {
      console.error(`[eventi/admin/comunicazioni] prova ${CAMPAGNE[campagna].etichetta}: ${r.errore}`);
      return errore(`La prova non è partita: ${r.errore}`, 502);
    }
    return NextResponse.json({ ok: true, email: a, esempio: r.esempio }, { headers: NESSUNA_CACHE });
  }

  try {
    const r = await inviaCampagna(client, resend, campagna, { autore: chiamante.id, origine: "pannello" });
    switch (r.stato) {
      case "bloccata":
        return errore(r.messaggio, 409, { bloccata: r.messaggio, tipoBlocco: r.tipo });
      case "gia_inviata":
        return errore("Questa email è già stata inviata: non si può mandare una seconda volta.", 409, {
          inviato_at: r.inviato_at,
        });
      case "prenotazione_fallita":
        return errore("Non è stato possibile registrare l'invio, quindi non è partito niente. Riprova tra poco.", 500);
      case "nessuna_partita":
        return errore(
          `Nessuna email è partita (${descriviEsito(r.esito)}). L'invio non è stato registrato: puoi riprovare quando il problema è risolto. I dettagli sono nei log.`,
          502,
          { esito: r.esito },
        );
      case "inviata":
        return NextResponse.json({ ok: true, inviato_at: r.inviato_at, esito: r.esito }, { headers: NESSUNA_CACHE });
    }
  } catch (err) {
    // Arriva qui solo se il database non risponde prima della prenotazione:
    // non è partita nessuna email.
    console.error("[eventi/admin/comunicazioni] invio:", err instanceof Error ? err.message : err);
    return errore("Non riesco a leggere i dati dal database: non è partita nessuna email. Riprova tra poco.", 500);
  }
}
