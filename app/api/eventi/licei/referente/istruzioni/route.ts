import { NextResponse } from "next/server";
import {
  VERSIONE_ISTRUZIONI_DOCENTE,
  erroreSchemaMancante,
  requireDocente,
  testoIstruzioniDocente,
} from "@/lib/eventi/licei-server";
import {
  DOCUMENTO_ISTRUZIONI_DOCENTE,
  INFORMATIVA_SCUOLE_PATH,
  ISTRUZIONI_DOCENTE_PATH,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Le istruzioni per i docenti, e la loro accettazione.
 *
 * E l'unica rotta dell'area docenti che risponde anche a chi non le ha
 * ancora accettate (`operativo: false`): serve proprio ad accettarle. Non
 * tocca dati di studenti, e non deve cominciare a farlo.
 *
 * Ogni docente le accetta, referente principale compreso, al primo accesso
 * e di nuovo a ogni versione. La versione e la data di aggiornamento del
 * documento pubblico, e il testo si congela con l'accettazione: fra un anno
 * la data da sola non direbbe a che cosa si e detto si.
 */

/** Versione in vigore, testo, e se il docente l'ha gia accettata. */
export async function GET() {
  const guard = await requireDocente({ operativo: false });
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const { data, error } = await client
    .from("licei_accettazioni")
    .select("accettato_at")
    .eq("user_id", ctx.userId)
    .eq("documento", DOCUMENTO_ISTRUZIONI_DOCENTE)
    .eq("versione", VERSIONE_ISTRUZIONI_DOCENTE)
    .limit(1);

  // Senza la tabella la funzione non e ancora attiva: la guardia conta le
  // istruzioni come accettate, e la console non mostra il cancello.
  const disponibile = !erroreSchemaMancante(error, "tabella");
  if (error && disponibile) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      disponibile,
      versione: VERSIONE_ISTRUZIONI_DOCENTE,
      testo: testoIstruzioniDocente(),
      accettate: ctx.istruzioniAccettate,
      accettate_at: (data?.[0]?.accettato_at as string | undefined) ?? null,
      ruolo: ctx.ruolo,
      documenti: {
        istruzioni: ISTRUZIONI_DOCENTE_PATH,
        informativa_scuole: INFORMATIVA_SCUOLE_PATH,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Registra l'accettazione della versione in vigore.
 *
 * Ripetere la chiamata a istruzioni gia accettate non sposta la data: vale
 * l'accettazione da cui il docente ha cominciato a vedere i dati. Se invece
 * il cancello era chiuso (prima volta, versione nuova, oppure docente del
 * progetto invitato di nuovo dopo una revoca) la riga si riscrive con data
 * e testo di adesso. Per un docente del progetto e anche il momento in cui
 * l'invito diventa attivo.
 */
export async function POST(request: Request) {
  const guard = await requireDocente({ operativo: false });
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json().catch(() => ({}))) as { accetto?: unknown };
  if (body.accetto !== true) {
    return NextResponse.json(
      { error: "Per continuare spunta la casella di accettazione delle istruzioni." },
      { status: 400 },
    );
  }

  const adesso = new Date().toISOString();
  const { error } = await client.from("licei_accettazioni").upsert(
    {
      user_id: ctx.userId,
      adesione_id: ctx.adesione.id,
      documento: DOCUMENTO_ISTRUZIONI_DOCENTE,
      versione: VERSIONE_ISTRUZIONI_DOCENTE,
      testo: testoIstruzioniDocente(),
      accettato_at: adesso,
    },
    { onConflict: "user_id,documento,versione", ignoreDuplicates: ctx.istruzioniAccettate },
  );

  if (error) {
    if (erroreSchemaMancante(error, "tabella")) {
      // Funzione non ancora attiva: niente da registrare, e niente da
      // bloccare, come per la guardia.
      return NextResponse.json({ success: true, disponibile: false, accettate: true });
    }
    console.error("Licei accettazione istruzioni error:", error);
    return NextResponse.json(
      { error: "Non è stato possibile registrare l'accettazione. Riprova fra poco." },
      { status: 500 },
    );
  }

  // Il docente del progetto passa da invitato ad attivo. Il filtro su
  // adesione_id e su stato non e ridondante: una riga revocata nel frattempo
  // non deve tornare attiva per effetto di questa chiamata.
  if (ctx.ruolo === "docente" && ctx.docenteId) {
    const { error: erroreStato } = await client
      .from("licei_docenti")
      .update({ stato: "attivo" })
      .eq("id", ctx.docenteId)
      .eq("adesione_id", ctx.adesione.id)
      .eq("stato", "invitato");
    if (erroreStato) {
      // Senza lo stato 'attivo' la guardia tiene chiuso il cancello: dirlo
      // subito, invece di un successo che alla schermata dopo non regge.
      // L'accettazione registrata resta, e una nuova chiamata la completa.
      console.error("Licei accettazione: stato docente non aggiornato:", erroreStato);
      return NextResponse.json(
        { error: "Non è stato possibile registrare l'accettazione. Riprova fra poco." },
        { status: 500 },
      );
    }
  }

  const { data } = await client
    .from("licei_accettazioni")
    .select("accettato_at")
    .eq("user_id", ctx.userId)
    .eq("documento", DOCUMENTO_ISTRUZIONI_DOCENTE)
    .eq("versione", VERSIONE_ISTRUZIONI_DOCENTE)
    .limit(1);

  return NextResponse.json({
    success: true,
    disponibile: true,
    accettate: true,
    versione: VERSIONE_ISTRUZIONI_DOCENTE,
    accettate_at: (data?.[0]?.accettato_at as string | undefined) ?? adesso,
  });
}
