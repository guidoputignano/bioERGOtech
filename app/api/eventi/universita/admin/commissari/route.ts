/**
 * La Commissione di valutazione dell'art. 8, vista dal pannello staff.
 *
 * Sono due elenchi di persone diversi e restano diversi: un admin che non
 * siede in Commissione non vota, un commissario che non e admin non tocca
 * la configurazione del percorso. Questa rotta e il punto in cui il primo
 * elenco compila il secondo, e non c'e nessun altro modo di entrarci.
 *
 * L'account del commissario si crea qui, come per i licei e per la stessa
 * ragione: chiedere a un professore ordinario di registrarsi da solo su un
 * sito, trovare la pagina giusta e capire quale ruolo ha e un modo
 * affidabile di non ricevere le sue schede.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import {
  universitaCommissarioEmailHtml,
  universitaCommissarioEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  RUOLI_COMMISSIONE_UNIVERSITA,
  SITE_URL,
  ruoloCommissioneLabelUniversita,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const RUOLI_VALIDI = new Set<string>(RUOLI_COMMISSIONE_UNIVERSITA.map((r) => r.value));

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Il diritto di voto discende dal ruolo e non dal corpo della richiesta.
 *
 * Un privilegio che un modulo puo impostare e un privilegio che prima o poi
 * qualcuno dimentichera di togliere, e qui il privilegio e contare nella
 * media che decide chi vince. L'unica voce senza voto dell'art. 8 e
 * l'osservatore, e lo dice la tabella dei ruoli, non chi compila.
 */
const dirittoDiVoto = (ruolo: string): boolean =>
  RUOLI_COMMISSIONE_UNIVERSITA.find((r) => r.value === ruolo)?.voto ?? true;

type RigaCommissario = {
  id: string;
  user_id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: string | null;
  diritto_voto: boolean;
  attivo: boolean;
  created_at: string;
  updated_at: string;
};

/** L'id di un DELETE, che il pannello puo mandare in query string o nel corpo. */
async function idDaRichiesta(request: Request): Promise<string> {
  const daUrl = new URL(request.url).searchParams.get("id");
  if (daUrl) return daUrl.trim();
  try {
    const body = (await request.json()) as { id?: unknown };
    return testo(body.id);
  } catch {
    // Un DELETE senza corpo e legittimo: l'assenza si tratta come "manca
    // l'id", che e la risposta che il chiamante deve ricevere comunque.
    return "";
  }
}

/** La Commissione, con quante schede ciascuno ha aperto e quante ne ha chiuse. */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const [{ data: commissari, error: erroreLettura }, { data: schede, error: erroreSchede }] =
    await Promise.all([
      client
        .from("universita_commissari")
        .select("*")
        .order("created_at", { ascending: true }),
      client.from("universita_valutazioni").select("commissario_id, chiusa"),
    ]);

  if (erroreLettura) {
    console.error("Universita admin commissari: lettura fallita:", erroreLettura);
    return NextResponse.json(
      { error: "Non è stato possibile leggere la Commissione." },
      { status: 500 },
    );
  }
  if (erroreSchede) {
    console.error("Universita admin commissari: lettura schede fallita:", erroreSchede);
  }

  // Quante ne ha chiuse ciascuno e il solo modo che lo staff ha di sapere
  // chi e indietro prima di chiudere la fase e calcolare le medie: una
  // scheda aperta non entra in classifica, e nessuno se ne accorge dopo.
  const conteggi = new Map<string, { totale: number; aperte: number; chiuse: number }>();
  for (const s of (schede ?? []) as { commissario_id: string; chiusa: boolean }[]) {
    const c = conteggi.get(s.commissario_id) ?? { totale: 0, aperte: 0, chiuse: 0 };
    c.totale += 1;
    if (s.chiusa) c.chiuse += 1;
    else c.aperte += 1;
    conteggi.set(s.commissario_id, c);
  }

  return NextResponse.json({
    commissari: ((commissari ?? []) as RigaCommissario[]).map((c) => ({
      ...c,
      schede: conteggi.get(c.id) ?? { totale: 0, aperte: 0, chiuse: 0 },
    })),
  });
}

/**
 * Aggiunge un componente della Commissione, con il suo account.
 *
 * Il ruolo e obbligatorio, a differenza del gemello dei licei, perche qui
 * non e un'etichetta: da lui discende il diritto di voto, e una riga senza
 * ruolo sarebbe una persona che vota per default senza che nessuno lo
 * abbia deciso.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    nome?: string;
    cognome?: string;
    email?: string;
    ruolo?: string;
  };

  const nome = testo(body.nome);
  const cognome = testo(body.cognome);
  const email = testo(body.email).toLowerCase();
  const ruolo = testo(body.ruolo);

  if (!nome) return NextResponse.json({ error: "Indica il nome." }, { status: 400 });
  if (!cognome) return NextResponse.json({ error: "Indica il cognome." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  if (!ruolo || !RUOLI_VALIDI.has(ruolo)) {
    return NextResponse.json({ error: "Ruolo non previsto dall'art. 8." }, { status: 400 });
  }

  const diritto_voto = dirittoDiVoto(ruolo);

  /* ── Account ── */
  let userId: string | null = null;
  let setPasswordUrl: string | undefined;

  const { data: profilo } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (profilo?.id) {
    userId = profilo.id;
  } else {
    const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: `${nome} ${cognome}` },
    });
    if (erroreCreazione || !creato.user) {
      console.error("Universita commissario createUser error:", erroreCreazione);
      return NextResponse.json(
        { error: "Non è stato possibile creare l'account del commissario." },
        { status: 500 },
      );
    }
    userId = creato.user.id;

    // Il link si genera solo per l'account appena creato. Chi era gia
    // registrato ha gia una password, e l'email glielo dice invece di
    // mandargli un recupero che non ha chiesto.
    const { data: link } = await client.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/auth/update-password` },
    });
    setPasswordUrl = link?.properties?.action_link;
  }

  // `onConflict: user_id` e non l'id della riga: la stessa persona reinvitata
  // due volte e la stessa persona, e l'unico e su `user_id`.
  const { data, error: erroreUpsert } = await client
    .from("universita_commissari")
    .upsert(
      { user_id: userId, nome, cognome, email, ruolo, diritto_voto, attivo: true },
      { onConflict: "user_id" },
    )
    .select()
    .maybeSingle<RigaCommissario>();

  if (erroreUpsert) {
    console.error("Universita commissario upsert error:", erroreUpsert);
    return NextResponse.json(
      { error: "Non è stato possibile salvare il commissario." },
      { status: 500 },
    );
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: email,
        subject: universitaCommissarioEmailSubject(),
        html: universitaCommissarioEmailHtml({
          nome: `${nome} ${cognome}`.trim(),
          // L'etichetta e non il valore: l'email si legge, e "esperto" da
          // solo non dice a un esterno che ruolo gli e stato dato.
          ruolo: ruoloCommissioneLabelUniversita(ruolo),
          dirittoVoto: diritto_voto,
          setPasswordUrl,
        }),
      });
    } catch (mailErr) {
      console.error("Universita commissario email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, commissario: data });
}

/**
 * Attiva, disattiva, corregge il ruolo.
 *
 * La disattivazione e la strada normale per chi lascia a lavoro fatto: gli
 * toglie l'accesso e lascia dove sono le schede che ha gia chiuso. Il
 * diritto di voto non e nel corpo nemmeno qui: se cambia il ruolo, ricade
 * dal ruolo nuovo.
 */
export async function PATCH(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    id?: string;
    attivo?: boolean;
    ruolo?: string;
  };

  if (!body.id) return NextResponse.json({ error: "Commissario non indicato." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (body.attivo !== undefined) patch.attivo = !!body.attivo;

  if (body.ruolo !== undefined) {
    const ruolo = testo(body.ruolo);
    if (!ruolo || !RUOLI_VALIDI.has(ruolo)) {
      return NextResponse.json({ error: "Ruolo non previsto dall'art. 8." }, { status: 400 });
    }
    patch.ruolo = ruolo;
    patch.diritto_voto = dirittoDiVoto(ruolo);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const { data, error: erroreUpdate } = await client
    .from("universita_commissari")
    .update(patch)
    .eq("id", body.id)
    .select()
    .maybeSingle<RigaCommissario>();

  if (erroreUpdate) {
    console.error("Universita commissario update error:", erroreUpdate);
    return NextResponse.json(
      { error: "Non è stato possibile aggiornare il commissario." },
      { status: 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Commissario non trovato." }, { status: 404 });

  return NextResponse.json({ success: true, commissario: data });
}

/**
 * Toglie un commissario dalla Commissione, e con lui le sue schede.
 *
 * Il `on delete cascade` della migrazione fa cadere le valutazioni insieme
 * alla riga, e le medie si ricalcolano senza. E' il comportamento giusto per
 * chi non avrebbe dovuto esserci, e sbagliato per chi si e limitato a
 * dimettersi a lavoro fatto: in quel caso si disattiva.
 *
 * La risposta dice quante schede sono cadute perche il pannello possa
 * scriverlo nella conferma. Il numero e leggibile anche prima, dalla GET,
 * che e dove la domanda "sto per distruggere qualcosa?" va posta.
 */
export async function DELETE(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const id = await idDaRichiesta(request);
  if (!id) return NextResponse.json({ error: "Commissario non indicato." }, { status: 400 });

  // Le schede si contano prima: dopo la cascata non c'e piu niente da
  // contare, e il numero e l'unica cosa che resta di quel lavoro.
  const { count } = await client
    .from("universita_valutazioni")
    .select("id", { count: "exact", head: true })
    .eq("commissario_id", id);

  const { data, error: erroreDelete } = await client
    .from("universita_commissari")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (erroreDelete) {
    console.error("Universita commissario delete error:", erroreDelete);
    return NextResponse.json(
      { error: "Non è stato possibile rimuovere il commissario." },
      { status: 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Commissario non trovato." }, { status: 404 });

  return NextResponse.json({ success: true, schede_eliminate: count ?? 0 });
}
