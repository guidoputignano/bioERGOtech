import { NextResponse } from "next/server";
import { leggiChiusuraPercorso, liceiAdminClient } from "@/lib/eventi/licei-server";
import { leggiFirmaInvito, leggiInvito, registraRisposta } from "@/lib/eventi/licei-questionario";
import {
  QUESTIONARIO_CHIUDE_LABEL,
  questionarioAperto,
  validaRisposte,
} from "@/app/eventi/vivere-piu-a-lungo/licei/questionario/domande";

/**
 * Le risposte al questionario di fine percorso. Nessun accesso: vale il
 * link firmato dell'email (`t`), che identifica un solo invito. Le risposte
 * si controllano qui con le stesse regole della pagina, poi la funzione del
 * database segna l'invito e salva, una volta sola.
 *
 * Nei log, solo l'esito: mai il token, l'invito o le risposte.
 *
 * 404 link non valido, 409 gia risposto, 410 chiuso, 400 risposte da
 * correggere (`campi`: un messaggio per domanda), 503 non ancora pronto.
 */

const NO_CACHE = { "Cache-Control": "private, no-store" };

const risposta = (status: number, corpo: Record<string, unknown>) =>
  NextResponse.json(corpo, { status, headers: NO_CACHE });

const NON_VALIDO = "Il link non è valido. Il questionario si apre dal pulsante dell'email ricevuta.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) return risposta(400, { error: "Richiesta non valida." });
  const { t, risposte } = body as { t?: unknown; risposte?: unknown };

  const id = leggiFirmaInvito(typeof t === "string" ? t : null);
  if (!id) return risposta(404, { error: NON_VALIDO });

  const db = liceiAdminClient();
  if (!db) return risposta(500, { error: "Configurazione server mancante." });

  try {
    const letto = await leggiInvito(db, id);
    if (!letto.presente) return risposta(503, { error: "Il questionario non è ancora disponibile. Riprova più tardi." });
    const invito = letto.invito;
    if (!invito) return risposta(404, { error: NON_VALIDO });
    const tu = invito.ruolo === "studente";
    const giaRisposto = tu
      ? "Le tue risposte sono già arrivate: il questionario si compila una volta sola."
      : "Le sue risposte sono già arrivate: il questionario si compila una volta sola.";
    if (invito.risposto) return risposta(409, { error: giaRisposto });

    if (!questionarioAperto() || (await leggiChiusuraPercorso(db)).chiusoAt) {
      return risposta(410, { error: `Si poteva rispondere fino a ${QUESTIONARIO_CHIUDE_LABEL}.` });
    }

    const v = validaRisposte(invito.ruolo, risposte);
    if (!v.ok) {
      return risposta(400, {
        error: "Alcune risposte vanno controllate.",
        campi: v.errori,
      });
    }

    const esito = await registraRisposta(db, invito.id, v.risposte);
    if (esito === "ok") return risposta(200, { ok: true });
    if (esito === "gia_risposto") return risposta(409, { error: giaRisposto });
    if (esito === "assente") return risposta(503, { error: "Il questionario non è ancora disponibile. Riprova più tardi." });
    return risposta(404, { error: NON_VALIDO });
  } catch (err) {
    console.error("Questionario licei: risposta non salvata:", err instanceof Error ? err.message : String(err));
    return risposta(500, { error: "Non siamo riusciti a salvare le risposte. Riprova tra qualche minuto." });
  }
}
