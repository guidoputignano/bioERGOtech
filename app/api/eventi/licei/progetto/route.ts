import { NextResponse } from "next/server";
import { Resend } from "resend";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import { requireStudente, verificaConsegneAperte } from "@/lib/eventi/licei-server";
import {
  validateBozza,
  validateConsegna,
  type ProgettoInput,
} from "@/lib/eventi/licei-squadre";
import { consegnaEmailHtml, consegnaEmailSubject } from "@/lib/eventi/licei-email";
import { CAMPI_PROGETTO } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Dal corpo della richiesta alle colonne, senza far passare nient'altro. */
function patchDaBody(body: Partial<ProgettoInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (body.titolo !== undefined) patch.titolo = testo(body.titolo);
  if (body.ambito !== undefined) patch.ambito = testo(body.ambito) || null;
  for (const c of CAMPI_PROGETTO) {
    if (body[c.campo] !== undefined) patch[c.campo] = testo(body[c.campo]);
  }
  if (body.link_materiali !== undefined) patch.link_materiali = testo(body.link_materiali) || null;
  return patch;
}

/**
 * Carica il progetto della squadra dello studente, con il numero di
 * componenti. Torna null se lo studente non e in una squadra.
 */
async function progettoDelloStudente(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  squadraId: string | null,
) {
  if (!squadraId) return null;
  const [{ data: progetto }, { count }] = await Promise.all([
    client.from("licei_progetti").select("*").eq("squadra_id", squadraId).maybeSingle(),
    client
      .from("licei_iscrizioni")
      .select("id", { count: "exact", head: true })
      .eq("squadra_id", squadraId),
  ]);
  if (!progetto) return null;
  return { progetto, componenti: count ?? 0 };
}

/** Salva la bozza. Ci scrive chiunque sia in squadra: il progetto è di tutti. */
export async function PATCH(request: Request) {
  const guard = await requireStudente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrente();
  const cancello = await verificaConsegneAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const dati = await progettoDelloStudente(client, ctx.iscrizione.squadra_id);
  if (!dati) {
    return NextResponse.json(
      { error: "Prima di scrivere il progetto devi entrare in una squadra." },
      { status: 409 },
    );
  }

  if (dati.progetto.stato === "consegnato") {
    return NextResponse.json(
      { error: "Il progetto è già stato consegnato e non è più modificabile." },
      { status: 409 },
    );
  }

  const body = (await request.json()) as Partial<ProgettoInput>;
  const errore = validateBozza(body);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  const patch = patchDaBody(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  // Il filtro su squadra_id vale quello su adesione_id delle altre rotte:
  // senza, conoscere l'id di un progetto basterebbe per riscriverlo.
  const { data, error } = await client
    .from("licei_progetti")
    .update(patch)
    .eq("id", dati.progetto.id)
    .eq("squadra_id", ctx.iscrizione.squadra_id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Licei progetto update error:", error);
    return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 500 });
  }

  return NextResponse.json({ success: true, progetto: data });
}

/**
 * Consegna. Da qui in poi il progetto non si tocca piu, quindi la validazione
 * e quella piena e la conferma la da il capitano: qualcuno deve rispondere
 * dell'atto finale, e nella squadra quel qualcuno e chi l'ha creata.
 */
export async function POST() {
  const guard = await requireStudente();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client, ctx } = guard;

  const utente = await utenteCorrente();
  const cancello = await verificaConsegneAperte(utente.staff);
  if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

  const dati = await progettoDelloStudente(client, ctx.iscrizione.squadra_id);
  if (!dati) {
    return NextResponse.json(
      { error: "Prima di consegnare devi entrare in una squadra." },
      { status: 409 },
    );
  }

  if (dati.progetto.stato === "consegnato") {
    return NextResponse.json({ error: "Il progetto è già stato consegnato." }, { status: 409 });
  }

  if (ctx.iscrizione.squadra_ruolo !== "capo") {
    return NextResponse.json(
      {
        error:
          "La consegna la fa chi ha creato la squadra. Fino ad allora potete continuare a lavorare sulla bozza.",
      },
      { status: 403 },
    );
  }

  // Si consegna quello che c'e scritto a database, non quello che il client
  // manda insieme al comando: cosi la conferma vale sulla stessa versione
  // che tutti i compagni hanno visto.
  const errore = validateConsegna(dati.progetto, dati.componenti);
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });

  const { data, error } = await client
    .from("licei_progetti")
    .update({ stato: "consegnato", consegnato_at: new Date().toISOString() })
    .eq("id", dati.progetto.id)
    .eq("squadra_id", ctx.iscrizione.squadra_id)
    .eq("stato", "bozza")
    .select()
    .maybeSingle();

  if (error || !data) {
    console.error("Licei consegna error:", error);
    return NextResponse.json({ error: "Consegna non riuscita. Riprova." }, { status: 500 });
  }

  /* ── Ricevuta a tutta la squadra ── */
  // A tutti, non al solo capitano: e il lavoro di tutti, e chi non ha
  // premuto il bottone ha comunque diritto di sapere che e stato premuto.
  if (process.env.RESEND_API_KEY) {
    try {
      const [{ data: membri }, { data: squadra }] = await Promise.all([
        client.from("licei_iscrizioni").select("nome, email").eq("squadra_id", ctx.iscrizione.squadra_id),
        client.from("licei_squadre").select("nome").eq("id", ctx.iscrizione.squadra_id).maybeSingle(),
      ]);

      const resend = new Resend(process.env.RESEND_API_KEY);
      await Promise.all(
        (membri ?? []).map((m: { nome: string; email: string }) =>
          resend.emails.send({
            from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
            to: m.email,
            subject: consegnaEmailSubject(),
            html: consegnaEmailHtml({
              nome: m.nome,
              squadra: squadra?.nome ?? "",
              titolo: data.titolo,
              istituto: ctx.istituto,
            }),
          }),
        ),
      );
    } catch (mailErr) {
      // La consegna e registrata: un problema email non la annulla.
      console.error("Licei consegna email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, progetto: data });
}
