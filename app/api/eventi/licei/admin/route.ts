import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import {
  STATI_ADESIONE,
  STATI_ADESIONE_CHE_ACCETTANO,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import {
  adesioneConfermataEmailHtml,
  adesioneConfermataEmailSubject,
} from "@/lib/eventi/licei-email";
import { TOTALE_LEZIONI, progressoPerUtenti } from "@/lib/eventi/licei-progresso";

const STATI_VALIDI = new Set<string>(STATI_ADESIONE.map((s) => s.value));

/** Elenco delle adesioni per il pannello staff, con filtri e conteggi. */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const stato = searchParams.get("stato") ?? "";

  let query = client
    .from("licei_adesioni")
    .select("*")
    .order("created_at", { ascending: false });

  if (stato && STATI_VALIDI.has(stato)) query = query.eq("stato", stato);

  // La ricerca la fa il database, non la memoria: con tutti i licei della
  // provincia, filtrare in JS dopo aver scaricato tutto non regge.
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    query = query.or(
      [
        `istituto_denominazione.ilike.${like}`,
        `codice_meccanografico.ilike.${like}`,
        `istituto_comune.ilike.${like}`,
        `referente_cognome.ilike.${like}`,
        `referente_email.ilike.${like}`,
        `codice.ilike.${like}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // `licei_stats` conta le PREVISIONI dichiarate all'adesione.
  // `licei_iscrizioni_stats` conta gli studenti veri. Servono entrambe, e
  // affiancate: lo scarto fra quanti una scuola diceva di portarne e quanti
  // ne ha portati e la sola misura che dice se il percorso sta funzionando
  // in quell'istituto, e finora non era visibile da nessuna parte.
  const [{ data: stats }, { data: iscrizioniStats }, { data: config }] = await Promise.all([
    client.rpc("licei_stats"),
    client.rpc("licei_iscrizioni_stats"),
    client.from("licei_config").select("chiave, valore"),
  ]);

  // Il progresso sul corso, aggregato per istituto. Va letto in due passi
  // perche serve prima sapere quali studenti appartengono a quale scuola.
  // Si prendono solo i confermati: e di loro che la scuola risponde, e un
  // rifiutato che non segue il corso non e un problema di nessuno.
  const { data: studenti } = await client
    .from("licei_iscrizioni")
    .select("adesione_id, user_id")
    .eq("stato", "confermata");

  const righeStudenti = (studenti ?? []) as { adesione_id: string; user_id: string | null }[];
  const progresso = await progressoPerUtenti(
    client,
    righeStudenti.map((r) => r.user_id).filter((id): id is string => !!id),
  );

  const progressoPerIstituto: Record<
    string,
    { confermati: number; lezioni_totali: number; fermi_a_zero: number }
  > = {};
  for (const r of righeStudenti) {
    const acc = (progressoPerIstituto[r.adesione_id] ??= {
      confermati: 0,
      lezioni_totali: 0,
      fermi_a_zero: 0,
    });
    const fatte = r.user_id ? (progresso.get(r.user_id) ?? 0) : 0;
    acc.confermati += 1;
    acc.lezioni_totali += fatte;
    if (fatte === 0) acc.fermi_a_zero += 1;
  }

  return NextResponse.json({
    adesioni: data ?? [],
    stats: stats ?? [],
    iscrizioni_stats: iscrizioniStats ?? [],
    progresso: progressoPerIstituto,
    totale_lezioni: TOTALE_LEZIONI,
    config: config ?? [],
  });
}

/** Istruttoria: stato dell'adesione e note interne. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client } = guard;

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    note_staff?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Adesione non indicata." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;
  }
  if (body.note_staff !== undefined) {
    patch.note_staff = body.note_staff?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  // Lo stato di partenza, letto prima di scrivere. Serve solo a distinguere una
  // transizione da un salvataggio qualsiasi: senza, una nota interna aggiunta a
  // un'adesione gia confermata rimanderebbe l'email ogni volta.
  let statoPrecedente: string | null = null;
  if (patch.stato !== undefined) {
    const { data: prima } = await client
      .from("licei_adesioni")
      .select("stato")
      .eq("id", body.id)
      .maybeSingle();
    statoPrecedente = prima?.stato ?? null;
  }

  const { data, error } = await client
    .from("licei_adesioni")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Avviso al referente, solo sulla transizione verso uno stato che accetta
  // iscrizioni. L'email di adesione gli promette alla lettera che gli
  // scriviamo alla conferma, e la sua console gli dice di aspettarla prima di
  // diffondere il codice: finora quella promessa era scoperta.
  const entraInAccettazione =
    statoPrecedente !== null &&
    !STATI_ADESIONE_CHE_ACCETTANO.has(statoPrecedente) &&
    typeof patch.stato === "string" &&
    STATI_ADESIONE_CHE_ACCETTANO.has(patch.stato);

  if (entraInAccettazione && process.env.RESEND_API_KEY && data?.referente_email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: data.referente_email,
        subject: adesioneConfermataEmailSubject(),
        html: adesioneConfermataEmailHtml({
          referente: `${data.referente_nome ?? ""} ${data.referente_cognome ?? ""}`.trim(),
          istituto: data.istituto_denominazione ?? "",
          codice: data.codice ?? "",
          attiva: patch.stato === "attiva",
        }),
      });
    } catch (mailErr) {
      // Lo stato e gia salvato: un problema di invio non deve far fallire
      // l'istruttoria dello staff.
      console.error("Licei conferma adesione email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, adesione: data });
}
