import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { RUOLI_COMMISSIONE } from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { accessiGiudici, aggiungiCommissario, inviaAccesso } from "@/lib/eventi/licei-commissari";
import { temiPuliti } from "@/app/eventi/vivere-piu-a-lungo/licei/smistamento";
import { analizza, leggiQuadro } from "@/lib/eventi/licei-commissione-auto";

const RUOLI_VALIDI = new Set<string>(RUOLI_COMMISSIONE.map((r) => r.value));
const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** La Commissione dell'art. 8, con quante schede ciascuno ha chiuso. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const [{ data: commissari, error }, { data: schede }] = await Promise.all([
    client.from("licei_commissari").select("*").order("created_at", { ascending: true }),
    client.from("licei_valutazioni").select("commissario_id, chiusa"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Quante ne ha chiuse ciascuno: e il solo modo che ha lo staff di sapere
  // chi e indietro prima di chiudere la fase e calcolare le medie.
  const conteggi = new Map<string, { aperte: number; chiuse: number }>();
  for (const s of (schede ?? []) as { commissario_id: string; chiusa: boolean }[]) {
    const c = conteggi.get(s.commissario_id) ?? { aperte: 0, chiuse: 0 };
    if (s.chiusa) c.chiuse += 1;
    else c.aperte += 1;
    conteggi.set(s.commissario_id, c);
  }

  // Lo smistamento: quanti progetti ha ciascuno, quanti ne ha chiusi, e la
  // media dei suoi totali accanto a quella di tutti. Un giudice molto piu
  // severo (o generoso) degli altri si vede qui, prima dell'annuncio.
  let smistamento: Record<string, { assegnati: number; chiusi: number }> = {};
  let presente = false;
  try {
    const q = await leggiQuadro(client);
    presente = q.assegnazioni.presente;
    const a = analizza(q);
    smistamento = Object.fromEntries([...a.perGiudice].map(([id, c]) => [id, { assegnati: c.assegnati, chiusi: c.chiusi }]));
  } catch (err) {
    console.error("Licei commissari: smistamento non letto:", err);
  }
  const { data: totali } = await client.from("licei_valutazioni").select("commissario_id, totale").eq("chiusa", true);
  const somme = new Map<string, { s: number; n: number }>();
  let tutte = { s: 0, n: 0 };
  for (const r of (totali ?? []) as { commissario_id: string; totale: number | null }[]) {
    const v = Number(r.totale ?? 0);
    const c = somme.get(r.commissario_id) ?? { s: 0, n: 0 };
    somme.set(r.commissario_id, { s: c.s + v, n: c.n + 1 });
    tutte = { s: tutte.s + v, n: tutte.n + 1 };
  }
  const media = (x: { s: number; n: number } | undefined) => (x && x.n ? Math.round((x.s / x.n) * 10) / 10 : null);

  // Chi e entrato nell'area e chi no, e se il promemoria e partito.
  let accessi = new Map<string, { entrato: boolean; quando: string | null; promemoria_at: string | null }>();
  try {
    accessi = await accessiGiudici(
      client,
      (commissari ?? []) as { id: string; user_id: string; created_at?: string | null; temi?: unknown }[],
    );
  } catch (err) {
    console.error("Licei commissari: accessi non letti:", err);
  }

  return NextResponse.json({
    smistamento_presente: presente,
    media_generale: media(tutte),
    commissari: (commissari ?? []).map((c: { id: string }) => ({
      ...c,
      schede: conteggi.get(c.id) ?? { aperte: 0, chiuse: 0 },
      smistamento: smistamento[c.id] ?? { assegnati: 0, chiusi: 0 },
      media: media(somme.get(c.id)),
      accesso: accessi.get(c.id) ?? null,
    })),
  });
}

/**
 * Aggiunge un membro della Commissione.
 *
 * Come per il docente referente, l'account si crea qui: chiedere a un
 * professore ordinario di registrarsi da solo su un sito per poi cercare la
 * pagina giusta e un modo affidabile di non ricevere le sue schede.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const body = (await request.json()) as {
    nome?: string;
    cognome?: string;
    email?: string;
    ruolo?: string;
    diritto_voto?: boolean;
  };

  const esito = await aggiungiCommissario(client, {
    nome: testo(body.nome),
    cognome: testo(body.cognome),
    email: testo(body.email),
    ruolo: testo(body.ruolo),
    diritto_voto: body.diritto_voto,
  });
  if (!esito.ok) return NextResponse.json({ error: esito.errore }, { status: esito.status });
  return NextResponse.json({ success: true, commissario: esito.commissario, email_inviata: esito.emailInviata });
}

/** Ruolo, diritto di voto, attivazione. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const body = (await request.json()) as {
    id?: string;
    ruolo?: string;
    diritto_voto?: boolean;
    attivo?: boolean;
    riserva?: boolean;
    temi?: unknown;
    azione?: string;
  };

  if (!body.id) return NextResponse.json({ error: "Commissario non indicato." }, { status: 400 });

  // "Rimanda l'accesso": di nuovo l'email con il link per scegliere la
  // password, a chi dice di non essere riuscito a entrare.
  if (body.azione === "rimanda_accesso") {
    const { data: c, error: e } = await client
      .from("licei_commissari")
      .select("id, user_id, nome, cognome, email, ruolo, diritto_voto")
      .eq("id", body.id)
      .maybeSingle();
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
    if (!c) return NextResponse.json({ error: "Commissario non trovato." }, { status: 404 });
    const r = await inviaAccesso(client, {
      userId: c.user_id,
      email: c.email,
      nome: `${c.nome} ${c.cognome}`.trim(),
      ruolo: c.ruolo,
      diritto_voto: c.diritto_voto,
    }, undefined, { forzaLink: true });
    if (!r.inviata) {
      return NextResponse.json({ error: "L'email non è partita. Riprova fra poco, o controlla l'indirizzo." }, { status: 502 });
    }
    return NextResponse.json({ success: true, email: c.email, login_email: r.loginEmail });
  }

  const patch: Record<string, unknown> = {};
  if (body.ruolo !== undefined) {
    const ruolo = testo(body.ruolo);
    if (ruolo && !RUOLI_VALIDI.has(ruolo)) {
      return NextResponse.json({ error: "Ruolo non previsto dall'art. 8." }, { status: 400 });
    }
    patch.ruolo = ruolo || null;
  }
  if (body.diritto_voto !== undefined) patch.diritto_voto = !!body.diritto_voto;
  if (body.attivo !== undefined) patch.attivo = !!body.attivo;
  // Riserva e temi chiedono la migrazione 20261231100000.
  if (body.riserva !== undefined) patch.riserva = !!body.riserva;
  if (body.temi !== undefined) patch.temi = temiPuliti(body.temi);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error } = await client
    .from("licei_commissari")
    .update(patch)
    .eq("id", body.id)
    .select()
    .maybeSingle();

  if (error) {
    if (/riserva|temi/.test(error.message ?? "") && /column|schema cache/i.test(error.message ?? "")) {
      return NextResponse.json({ error: "Riserva e temi chiedono la migrazione 20261231100000." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Commissario non trovato." }, { status: 404 });

  return NextResponse.json({ success: true, commissario: data });
}

/**
 * Toglie un commissario dalla Commissione.
 *
 * Le sue schede cadono con lui, per via del `on delete cascade`, e le medie
 * si ricalcolano senza. E' il comportamento giusto per chi non avrebbe
 * dovuto esserci, ma non per chi si e limitato a dimettersi a lavoro fatto:
 * in quel caso si disattiva, che gli toglie l'accesso e lascia i voti dove
 * sono. Il pannello propone la disattivazione, questa rotta resta per gli
 * inserimenti sbagliati.
 */
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Commissario non indicato." }, { status: 400 });

  const { error } = await client.from("licei_commissari").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
