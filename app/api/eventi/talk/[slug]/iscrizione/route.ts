import { NextResponse } from "next/server";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import {
  TABELLA_TALK,
  contaIscritti,
  giaIscritto,
  idoneitaTalk,
  statoTalk,
  talkAdminClient,
} from "@/lib/eventi/talk-server";
import { TESTI_TALK, talkConcluso, trovaTalk } from "@/app/eventi/vivere-piu-a-lungo/talk/content";

/**
 * L'iscrizione a un talk: GET dice a che punto e chi chiama, POST iscrive,
 * DELETE annulla.
 *
 * Nessun modulo e nessun dato personale nuovo: la riga lega l'account al
 * talk, con il ruolo e (per i licei) l'istituto, e basta. Nome ed email li
 * conosciamo gia dal percorso, e restano dove sono.
 *
 * Il client e quello con service role, e scavalca la RLS: lo slug si
 * controlla contro `TALKS` prima di tutto, l'utente e quello della sessione,
 * e ogni query filtra per tutti e due. Dal browser non arriva nessun id.
 *
 * Prima della migrazione 20261216000000 la tabella non c'e: GET risponde
 * `disponibile: false`, POST e DELETE 503, e la pagina dice "Le iscrizioni
 * aprono a breve.". Niente si rompe.
 *
 * Il link della riunione esce solo da qui, e solo per chi e iscritto.
 */

type Contesto = { params: Promise<{ slug: string }> };

const NO_CACHE = { "Cache-Control": "private, no-store" };

const risposta = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: NO_CACHE });

const erroreGenerico = (err: unknown) => {
  console.error("Talk iscrizione error:", err);
  return risposta({ error: TESTI_TALK.erroreCaricamento }, 500);
};

/** Lo slug, se e quello di un talk vero. */
async function talkDa(ctx: Contesto) {
  const { slug } = await ctx.params;
  return trovaTalk(slug);
}

export async function GET(_request: Request, ctx: Contesto) {
  const talk = await talkDa(ctx);
  if (!talk) return risposta({ error: "Talk non trovato." }, 404);

  try {
    const db = talkAdminClient();
    if (!db) return risposta({ error: "Configurazione server mancante." }, 500);
    const utente = await utenteCorrente();
    return risposta(await statoTalk(db, talk, utente));
  } catch (err) {
    return erroreGenerico(err);
  }
}

export async function POST(_request: Request, ctx: Contesto) {
  const talk = await talkDa(ctx);
  if (!talk) return risposta({ error: "Talk non trovato." }, 404);

  if (talkConcluso(talk)) {
    return risposta({ error: "Il talk si è concluso: le iscrizioni sono chiuse." }, 409);
  }

  try {
    const utente = await utenteCorrente();
    if (!utente.id) return risposta({ error: "Accedi per iscriverti." }, 401);

    const db = talkAdminClient();
    if (!db) return risposta({ error: "Configurazione server mancante." }, 500);

    const conteggio = await contaIscritti(db, talk.slug);
    if (!conteggio.presente) {
      return risposta({ disponibile: false, error: TESTI_TALK.nonDisponibile }, 503);
    }

    const idoneita = await idoneitaTalk(db, utente.id, utente.staff);
    if (!idoneita.idoneo) return risposta({ error: TESTI_TALK.nonIdoneo }, 403);

    // Un secondo clic, o due schede aperte: chi e gia iscritto resta iscritto.
    if (!(await giaIscritto(db, talk.slug, utente.id))) {
      // Il controllo dei posti e qui e non a database: con `capienza` nulla
      // non scatta, e con una capienza vera due iscrizioni nello stesso
      // istante possono superarla di una. Per un talk online e accettabile;
      // se servisse un tetto rigido, va spostato in una funzione SQL.
      if (talk.capienza !== null && conteggio.totale >= talk.capienza) {
        return risposta({ error: TESTI_TALK.esauriti }, 409);
      }

      const { error } = await db.from(TABELLA_TALK).insert({
        talk_slug: talk.slug,
        user_id: utente.id,
        ruolo: idoneita.ruolo,
        adesione_id: idoneita.adesioneId,
      });
      // 23505: la stessa persona, nello stesso istante, da un'altra scheda.
      if (error && error.code !== "23505") throw new Error(`${TABELLA_TALK}: ${error.message}`);
    }

    return risposta(await statoTalk(db, talk, utente));
  } catch (err) {
    return erroreGenerico(err);
  }
}

export async function DELETE(_request: Request, ctx: Contesto) {
  const talk = await talkDa(ctx);
  if (!talk) return risposta({ error: "Talk non trovato." }, 404);

  if (talkConcluso(talk)) {
    return risposta({ error: "Il talk si è concluso: l'iscrizione non si modifica più." }, 409);
  }

  try {
    const utente = await utenteCorrente();
    if (!utente.id) return risposta({ error: "Accedi per gestire l'iscrizione." }, 401);

    const db = talkAdminClient();
    if (!db) return risposta({ error: "Configurazione server mancante." }, 500);

    const conteggio = await contaIscritti(db, talk.slug);
    if (!conteggio.presente) {
      return risposta({ disponibile: false, error: TESTI_TALK.nonDisponibile }, 503);
    }

    // Nessun controllo di idoneita: la propria iscrizione si puo togliere
    // sempre, anche da chi non partecipa piu al percorso.
    const { error } = await db
      .from(TABELLA_TALK)
      .delete()
      .eq("talk_slug", talk.slug)
      .eq("user_id", utente.id);
    if (error) throw new Error(`${TABELLA_TALK}: ${error.message}`);

    return risposta(await statoTalk(db, talk, utente));
  } catch (err) {
    return erroreGenerico(err);
  }
}
