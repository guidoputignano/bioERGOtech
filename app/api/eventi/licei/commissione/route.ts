import { NextResponse } from "next/server";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import {
  leggiConfigLicei,
  requireCommissario,
  verificaValutazioneAperta,
} from "@/lib/eventi/licei-server";
import { validateValutazione, type ValutazioneInput } from "@/lib/eventi/licei-squadre";
import { CRITERI_LICEI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

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

/** I progetti consegnati e le proprie schede. */
export async function GET() {
  const guard = await requireCommissario();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const config = await leggiConfigLicei();

  const [{ data: progetti, error }, { data: valutazioni }] = await Promise.all([
    client
      .from("licei_progetti")
      .select(CAMPI_PROGETTO_COMMISSIONE)
      .eq("stato", "consegnato")
      .order("consegnato_at", { ascending: true }),
    client
      .from("licei_valutazioni")
      .select("*")
      .eq("commissario_id", ctx.commissario.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    commissario: ctx.commissario,
    progetti: progetti ?? [],
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
