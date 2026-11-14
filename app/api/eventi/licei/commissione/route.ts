import { NextResponse } from "next/server";
import { Resend } from "resend";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import {
  leggiConfigLicei,
  requireCommissario,
  verificaValutazioneAperta,
} from "@/lib/eventi/licei-server";
import { validateValutazione, type ValutazioneInput } from "@/lib/eventi/licei-squadre";
import { CRITERI_LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  APERTI_PER_CHIEDERE_ALTRI,
  SCADENZA_GIUDICI_LABEL,
  temiPuliti,
} from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import {
  analizza,
  assegnaAltri,
  leggiAssegnazioni,
  leggiQuadro,
  segnaConflitto,
  type Db,
} from "@/lib/eventi/licei-commissione-auto";
import { assegnazioneAttiva } from "@/lib/eventi/licei-smistamento";
import { erroreSchemaMancante } from "@/lib/eventi/licei-server";
import { MITTENTE_AVVISI, RISPOSTE_AVVISI } from "@/lib/eventi/licei-avvisi";
import { ENTRO_GIUDICI, giudiceNuoviHtml, giudiceNuoviSubject } from "@/lib/eventi/licei-commissione-email";

/**
 * Quello che la Commissione vede di un progetto.
 *
 * Non ci sono i nomi degli studenti, e non e una dimenticanza: la
 * Commissione valuta progetti, non ragazzi. I criteri dell'art. 7 si
 * applicano tutti al lavoro, nessuno a chi lo ha fatto, e questa
 * Commissione comprende esperti esterni e rappresentanti d'impresa che non
 * hanno ragione di ricevere l'anagrafica di trenta minorenni. Restano il
 * nome della squadra e l'istituto, che servono a discutere in seduta.
 */
const CAMPI_PROGETTO_COMMISSIONE =
  "id, titolo, ambito, problema, soluzione, tecnologie, impatto, etica, metodo, link_materiali, consegnato_at, licei_squadre(nome), licei_adesioni(istituto_denominazione)";

/** I progetti consegnati, con i temi se la colonna c'e (migrazione 20261231100000). */
async function progettiConsegnati(client: Db) {
  const leggi = (campi: string) =>
    client.from("licei_progetti").select(campi).eq("stato", "consegnato").order("consegnato_at", { ascending: true });
  const conTemi = await leggi(`${CAMPI_PROGETTO_COMMISSIONE}, temi`);
  if (!conTemi.error || !erroreSchemaMancante(conTemi.error)) return conTemi;
  return leggi(CAMPI_PROGETTO_COMMISSIONE);
}

/** I temi e la riserva del commissario, se le colonne ci sono. */
async function profiloGiudice(client: Db, id: string): Promise<{ temi: string[] | null; riserva: boolean }> {
  const { data } = await client.from("licei_commissari").select("*").eq("id", id).maybeSingle();
  const r = (data ?? {}) as { temi?: unknown; riserva?: unknown };
  return { temi: Array.isArray(r.temi) ? (r.temi as string[]) : null, riserva: r.riserva === true };
}

/**
 * Lo smistamento vale per chi vota: dal momento in cui esiste anche una sola
 * assegnazione, il giudice con diritto di voto vede e valuta solo i suoi
 * progetti. Il referente del consorzio, consultivo, continua a leggerli
 * tutti. Prima della migrazione non c'e smistamento.
 */
async function smistamentoPer(client: Db, commissarioId: string, dirittoVoto: boolean) {
  const assegn = await leggiAssegnazioni(client);
  const mie = assegn.righe.filter((a) => a.commissario_id === commissarioId);
  return {
    presente: assegn.presente,
    attivo: dirittoVoto && assegn.righe.length > 0,
    mie: new Set(mie.filter(assegnazioneAttiva).map((a) => a.progetto_id)),
  };
}
/** I progetti consegnati e le proprie schede. */
export async function GET() {
  const guard = await requireCommissario();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const config = await leggiConfigLicei();

  const [{ data: progetti, error }, { data: valutazioni }, profilo, smistamento] = await Promise.all([
    progettiConsegnati(client),
    client
      .from("licei_valutazioni")
      .select("*")
      .eq("commissario_id", ctx.commissario.id),
    profiloGiudice(client, ctx.commissario.id),
    smistamentoPer(client, ctx.commissario.id, ctx.commissario.diritto_voto),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tutti = (progetti ?? []) as unknown as { id: string }[];
  const visibili = smistamento.attivo ? tutti.filter((p) => smistamento.mie.has(p.id)) : tutti;

  return NextResponse.json({
    commissario: { ...ctx.commissario, temi: profilo.temi, riserva: profilo.riserva },
    progetti: visibili,
    smistamento: {
      // La migrazione c'e: il giudice puo scegliere i temi.
      presente: smistamento.presente,
      attivo: smistamento.attivo,
      assegnati: smistamento.mie.size,
      scadenza: SCADENZA_GIUDICI_LABEL,
    },
    // Solo le proprie. Il punteggio dei colleghi non compare, e non e
    // riservatezza fine a se stessa: un voto letto prima di dare il proprio
    // lo tira verso di se, e cinque giudizi ancorati valgono meno di cinque
    // giudizi indipendenti.
    valutazioni: valutazioni ?? [],
    fase: config.stato_valutazione,
  });
}

/** Salva la propria scheda su un progetto. */
export async function PATCH(request: Request) {
  const guard = await requireCommissario();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrente();
  const cancello = await verificaValutazioneAperta(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const body = (await request.json()) as ValutazioneInput & { progetto_id?: string };

  if (!body.progetto_id) {
    return NextResponse.json({ error: "Progetto non indicato." }, { status: 400 });
  }

  const errore = validateValutazione(body);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  // Si valuta solo quello che e stato consegnato. Una bozza non e un
  // progetto, e giudicare un lavoro in corso sarebbe ingiusto verso chi lo
  // sta ancora scrivendo.
  const { data: progetto } = await client
    .from("licei_progetti")
    .select("id, stato")
    .eq("id", body.progetto_id)
    .maybeSingle();

  if (!progetto || progetto.stato !== "consegnato") {
    return NextResponse.json({ error: "Progetto non trovato fra quelli consegnati." }, { status: 404 });
  }

  // Dopo lo smistamento chi vota valuta solo i progetti che gli sono stati
  // affidati: anche una scheda in piu, su un progetto scelto da se, sposta
  // la media di quel progetto rispetto agli altri. Lo staff resta libero.
  if (!utente.staff) {
    const smistamento = await smistamentoPer(client, ctx.commissario.id, ctx.commissario.diritto_voto);
    if (smistamento.attivo && !smistamento.mie.has(body.progetto_id)) {
      return NextResponse.json({ error: "Questo progetto non è fra quelli affidati a lei." }, { status: 403 });
    }
  }

  const riga: Record<string, unknown> = {
    progetto_id: body.progetto_id,
    commissario_id: ctx.commissario.id,
  };

  for (const c of CRITERI_LICEI) {
    if (body[c.campo] !== undefined) {
      riga[c.campo] = body[c.campo] === null || body[c.campo] === undefined
        ? null
        : Number(body[c.campo]);
    }
  }
  if (body.nota !== undefined) riga.nota = body.nota?.toString().trim() || null;
  if (body.chiusa !== undefined) {
    riga.chiusa = !!body.chiusa;
    riga.chiusa_at = body.chiusa ? new Date().toISOString() : null;
  }

  const { data, error } = await client
    .from("licei_valutazioni")
    .upsert(riga, { onConflict: "progetto_id,commissario_id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Licei valutazione error:", error);
    return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 500 });
  }

  return NextResponse.json({ success: true, valutazione: data });
}

/**
 * Le azioni del giudice sullo smistamento:
 *  - `temi`: i temi in cui si sente competente;
 *  - `conflitto`: "Conosco questa squadra", il progetto passa a un collega;
 *  - `altri`: "Ho tempo, me ne dia altri".
 */
export async function POST(request: Request) {
  const guard = await requireCommissario();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;
  const body = (await request.json().catch(() => ({}))) as { azione?: string; temi?: unknown; progetto_id?: string };

  if (body.azione === "temi") {
    const temi = temiPuliti(body.temi);
    const { error } = await client.from("licei_commissari").update({ temi }).eq("id", ctx.commissario.id);
    if (error) {
      if (erroreSchemaMancante(error)) {
        return NextResponse.json({ error: "La scelta dei temi non è ancora attiva. Riprovi fra poco." }, { status: 503 });
      }
      console.error("Licei commissario temi error:", error);
      return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 500 });
    }
    return NextResponse.json({ success: true, temi });
  }

  if (body.azione === "conflitto") {
    if (!body.progetto_id) return NextResponse.json({ error: "Progetto non indicato." }, { status: 400 });
    try {
      const r = await segnaConflitto(client, ctx.commissario.id, body.progetto_id);
      if (!r.ok) return NextResponse.json({ error: r.errore }, { status: 409 });
      // Al sostituto, subito: non aspetta il cron di domani.
      if (r.sostituto && process.env.RESEND_API_KEY) {
        try {
          await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: MITTENTE_AVVISI,
            to: r.sostituto.email,
            replyTo: RISPOSTE_AVVISI,
            subject: giudiceNuoviSubject(),
            html: giudiceNuoviHtml({ nome: `${r.sostituto.nome} ${r.sostituto.cognome}`.trim(), n: 1, entro: ENTRO_GIUDICI }),
          });
        } catch (mailErr) {
          console.error("Licei conflitto: email al sostituto non partita:", mailErr);
        }
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Licei conflitto error:", err);
      return NextResponse.json({ error: "Operazione non riuscita. Riprovi." }, { status: 500 });
    }
  }

  if (body.azione === "altri") {
    if (!ctx.commissario.diritto_voto) {
      return NextResponse.json({ error: "Con funzioni consultive non riceve progetti da valutare." }, { status: 403 });
    }
    const utente = await utenteCorrente();
    const cancello = await verificaValutazioneAperta(utente.staff);
    if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });
    try {
      const q = await leggiQuadro(client);
      if (!q.assegnazioni.presente || q.assegnazioni.righe.length === 0) {
        return NextResponse.json({ error: "I progetti si smistano il 26 novembre." }, { status: 409 });
      }
      const a = analizza(q);
      const mio = a.perGiudice.get(ctx.commissario.id);
      const aperti = (mio?.assegnati ?? 0) - (mio?.chiusi ?? 0);
      if (aperti > APERTI_PER_CHIEDERE_ALTRI) {
        return NextResponse.json(
          { error: `Può chiederne altri quando gliene restano al massimo ${APERTI_PER_CHIEDERE_ALTRI} da chiudere.` },
          { status: 409 },
        );
      }
      const profilo = q.giudici.find((g) => g.id === ctx.commissario.id);
      const n = await assegnaAltri(client, { id: ctx.commissario.id, temi: profilo?.temi ?? [], ruolo: profilo?.ruolo ?? null });
      if (n === 0) return NextResponse.json({ error: "Non ci sono altri progetti da affidarle: li ha già visti tutti." }, { status: 409 });
      return NextResponse.json({ success: true, aggiunti: n });
    } catch (err) {
      console.error("Licei altri progetti error:", err);
      return NextResponse.json({ error: "Operazione non riuscita. Riprovi." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
}
