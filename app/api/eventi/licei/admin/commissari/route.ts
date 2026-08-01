import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import { commissarioEmailHtml, commissarioEmailSubject } from "@/lib/eventi/licei-email";
import {
  RUOLI_COMMISSIONE,
  SITE_URL,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const RUOLI_VALIDI = new Set<string>(RUOLI_COMMISSIONE.map((r) => r.value));
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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

  return NextResponse.json({
    commissari: (commissari ?? []).map((c: { id: string }) => ({
      ...c,
      schede: conteggi.get(c.id) ?? { aperte: 0, chiuse: 0 },
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

  const nome = testo(body.nome);
  const cognome = testo(body.cognome);
  const email = testo(body.email).toLowerCase();
  const ruolo = testo(body.ruolo);

  if (!nome) return NextResponse.json({ error: "Indica il nome." }, { status: 400 });
  if (!cognome) return NextResponse.json({ error: "Indica il cognome." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  if (ruolo && !RUOLI_VALIDI.has(ruolo)) {
    return NextResponse.json({ error: "Ruolo non previsto dall'art. 8." }, { status: 400 });
  }

  // Il diritto di voto segue il ruolo, salvo indicazione contraria: l'art. 8
  // lo nega al solo referente del consorzio, e lasciare la scelta libera
  // significherebbe poterlo dimenticare.
  const dirittoDaRuolo = RUOLI_COMMISSIONE.find((r) => r.value === ruolo)?.voto ?? true;
  const diritto_voto = body.diritto_voto === undefined ? dirittoDaRuolo : !!body.diritto_voto;

  /* ── Account ── */
  let userId: string | null = null;
  let setPasswordUrl: string | undefined;

  const { data: profilo } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profilo?.id) {
    userId = profilo.id;
  } else {
    const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${nome} ${cognome}` },
    });
    if (erroreCreazione || !creato.user) {
      console.error("Licei commissario createUser error:", erroreCreazione);
      return NextResponse.json(
        { error: "Non è stato possibile creare l'account del commissario." },
        { status: 500 },
      );
    }
    userId = creato.user.id;

    const { data: link } = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    setPasswordUrl = link?.properties?.action_link;
  }

  const { data, error } = await client
    .from("licei_commissari")
    .upsert(
      { user_id: userId, nome, cognome, email, ruolo: ruolo || null, diritto_voto, attivo: true },
      { onConflict: "user_id" },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("Licei commissario upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: email,
        subject: commissarioEmailSubject(),
        html: commissarioEmailHtml({ nome, ruolo, diritto_voto, setPasswordUrl }),
      });
    } catch (mailErr) {
      console.error("Licei commissario email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, commissario: data });
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
  };

  if (!body.id) return NextResponse.json({ error: "Commissario non indicato." }, { status: 400 });

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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error } = await client
    .from("licei_commissari")
    .update(patch)
    .eq("id", body.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
