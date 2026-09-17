/**
 * Il registro dei mentor dell'art. 3, visto dal pannello staff.
 *
 * Qui succedono due cose che altrove non succedono. La prima e la decisione
 * sulla candidatura: un ricercatore che si propone da fuori resta
 * `proposta` finche la direzione scientifica non guarda la sua riga, e
 * approvarla e il momento in cui nasce il suo account, perche e il momento
 * in cui diventa qualcuno che ha qualcosa da vedere. Prima di allora un
 * account sarebbe una casella vuota consegnata a una persona che non ha
 * chiesto di registrarsi su questo sito.
 *
 * La seconda e l'abbinamento con una squadra. L'art. 5 promette "mentoring
 * e accompagnamento alla progettazione scientifica lungo tutto il
 * percorso": senza una riga in `universita_mentor_squadre` quella promessa
 * resta una frase in pagina, e il mentor non vede nessun progetto perche la
 * policy che glieli mostra parte proprio da li.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getEventAdminClient } from "@/lib/eventi/admin-guard";
import { messaggioErroreDb } from "@/lib/eventi/universita-squadre";
import {
  universitaEsitoMentorEmailHtml,
  universitaEsitoMentorEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  SITE_URL,
  STATI_MENTOR,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const STATI_VALIDI = new Set<string>(STATI_MENTOR.map((s) => s.value));

const testo = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

type RigaMentor = {
  id: string;
  user_id: string | null;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  ruolo: string;
  organizzazione: string;
  aree: string[];
  bio: string;
  competenze: string;
  disponibilita: string | null;
  sito: string | null;
  linkedin: string | null;
  foto_url: string | null;
  stato: string;
  origine: string;
  consenso_pubblicazione: boolean;
  consenso_privacy: boolean;
  note_staff: string | null;
  created_at: string;
  updated_at: string;
};

type RigaAssegnazione = {
  id: string;
  mentor_id: string;
  squadra_id: string;
  nota: string | null;
  created_at: string;
};

type RigaSquadra = { id: string; nome: string; codice: string; stato: string };

/** L'id di un DELETE, che il pannello puo mandare in query string o nel corpo. */
async function idDaRichiesta(request: Request): Promise<string> {
  const daUrl = new URL(request.url).searchParams.get("id");
  if (daUrl) return daUrl.trim();
  try {
    const body = (await request.json()) as { id?: unknown };
    return testo(body.id);
  } catch {
    return "";
  }
}

/**
 * L'elenco dei mentor con le squadre che seguono.
 *
 * Tre letture e un innesto in memoria, invece di un embed annidato di
 * PostgREST: le squadre servono comunque per intero al pannello, che senza
 * di esse non avrebbe niente da mettere nella tendina dell'abbinamento, e
 * un join fatto qui non dipende da come si chiama una relazione.
 */
export async function GET() {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const [
    { data: mentor, error: erroreMentor },
    { data: assegnazioni, error: erroreAssegnazioni },
    { data: squadre, error: erroreSquadre },
  ] = await Promise.all([
    client.from("universita_mentor").select("*").order("created_at", { ascending: false }),
    client
      .from("universita_mentor_squadre")
      .select("id, mentor_id, squadra_id, nota, created_at"),
    client
      .from("universita_squadre")
      .select("id, nome, codice, stato")
      .order("nome", { ascending: true }),
  ]);

  if (erroreMentor) {
    console.error("Universita admin mentor: lettura fallita:", erroreMentor);
    return NextResponse.json(
      { error: "Non è stato possibile leggere i mentor." },
      { status: 500 },
    );
  }
  if (erroreAssegnazioni) {
    console.error("Universita admin mentor: lettura abbinamenti fallita:", erroreAssegnazioni);
  }
  if (erroreSquadre) {
    console.error("Universita admin mentor: lettura squadre fallita:", erroreSquadre);
  }

  const righeSquadre = (squadre ?? []) as RigaSquadra[];
  const perId = new Map(righeSquadre.map((s) => [s.id, s]));

  const perMentor = new Map<string, unknown[]>();
  for (const a of (assegnazioni ?? []) as RigaAssegnazione[]) {
    const squadra = perId.get(a.squadra_id) ?? null;
    const elenco = perMentor.get(a.mentor_id) ?? [];
    elenco.push({
      // L'id dell'abbinamento e non quello della squadra: e quello che la
      // DELETE si aspetta, e confonderli significherebbe togliere la
      // squadra sbagliata a un mentor che non c'entra.
      assegnazione_id: a.id,
      squadra_id: a.squadra_id,
      nome: squadra?.nome ?? null,
      codice: squadra?.codice ?? null,
      stato: squadra?.stato ?? null,
      nota: a.nota,
      created_at: a.created_at,
    });
    perMentor.set(a.mentor_id, elenco);
  }

  return NextResponse.json({
    mentor: ((mentor ?? []) as RigaMentor[]).map((m) => ({
      ...m,
      squadre: perMentor.get(m.id) ?? [],
    })),
    squadre: righeSquadre,
  });
}

/**
 * Decide una candidatura a mentor.
 *
 * L'account nasce sull'approvazione e non prima: e li che il mentor diventa
 * qualcuno con qualcosa da vedere, cioe i progetti delle squadre che gli
 * verranno abbinate. Il link per la password si genera solo se l'account lo
 * creiamo adesso, perche chi era gia registrato sul sito una password ce
 * l'ha, e l'email che gli arriva dice "abbiamo creato il suo account": a lui
 * non sarebbe vero.
 */
export async function PATCH(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    id?: string;
    stato?: string;
    note_staff?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "Mentor non indicato." }, { status: 400 });

  const { data: mentor, error: erroreLettura } = await client
    .from("universita_mentor")
    .select("id, nome, cognome, email, user_id, stato, consenso_pubblicazione")
    .eq("id", body.id)
    .maybeSingle<{
      id: string;
      nome: string;
      cognome: string;
      email: string;
      user_id: string | null;
      stato: string;
      consenso_pubblicazione: boolean;
    }>();

  if (erroreLettura) {
    console.error("Universita admin mentor: lettura candidatura fallita:", erroreLettura);
    return NextResponse.json(
      { error: "Non è stato possibile leggere la candidatura." },
      { status: 500 },
    );
  }
  if (!mentor) return NextResponse.json({ error: "Mentor non trovato." }, { status: 404 });

  const patch: Record<string, unknown> = {};

  if (body.stato !== undefined) {
    if (!STATI_VALIDI.has(body.stato)) {
      return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
    }
    patch.stato = body.stato;
  }
  if (body.note_staff !== undefined) patch.note_staff = body.note_staff?.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nessuna modifica richiesta." }, { status: 400 });
  }

  const email = (mentor.email ?? "").trim().toLowerCase();
  const approva = patch.stato === "approvata";
  let setPasswordUrl: string | undefined;

  if (approva && !mentor.user_id) {
    if (!email) {
      return NextResponse.json(
        { error: "Questa candidatura non ha un indirizzo email." },
        { status: 400 },
      );
    }

    // Prima il profilo, poi la creazione: chi e gia registrato sul sito per
    // il portale o per un altro bando non deve ritrovarsi un secondo
    // account con lo stesso indirizzo.
    const { data: profilo } = await client
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle<{ id: string }>();

    if (profilo?.id) {
      patch.user_id = profilo.id;
    } else {
      const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: `${mentor.nome} ${mentor.cognome}`.trim() },
      });
      if (erroreCreazione || !creato.user) {
        console.error("Universita mentor createUser error:", erroreCreazione);
        return NextResponse.json(
          { error: "Non è stato possibile creare l'account del mentor." },
          { status: 500 },
        );
      }
      patch.user_id = creato.user.id;

      const { data: link } = await client.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${SITE_URL}/auth/update-password` },
      });
      setPasswordUrl = link?.properties?.action_link;
    }
  }

  const { data, error: erroreUpdate } = await client
    .from("universita_mentor")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .maybeSingle<RigaMentor>();

  if (erroreUpdate) {
    const messaggio = messaggioErroreDb(erroreUpdate.message);
    if (messaggio) return NextResponse.json({ error: messaggio }, { status: 400 });
    console.error("Universita mentor update error:", erroreUpdate);
    return NextResponse.json(
      { error: "Non è stato possibile aggiornare la candidatura." },
      { status: 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Mentor non trovato." }, { status: 404 });

  // ── Esito al mentor ──
  // Solo sulla transizione, come per le candidature degli studenti: salvare
  // una nota interna su una riga gia decisa non e una nuova decisione, e
  // rimandare l'esito ogni volta sembrerebbe un ripensamento.
  const cambiaStato = patch.stato !== undefined && patch.stato !== mentor.stato;
  const esito = cambiaStato && (patch.stato === "approvata" || patch.stato === "respinta");

  if (esito && process.env.RESEND_API_KEY && email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
        to: email,
        subject: universitaEsitoMentorEmailSubject(approva),
        html: universitaEsitoMentorEmailHtml({
          nome: `${data.nome} ${data.cognome}`.trim(),
          approvata: approva,
          // Approvata e pubblicata sono due cose distinte: senza consenso
          // il profilo resta fuori dalla pagina pubblica, e l'email glielo
          // dice invece di lasciarglielo scoprire.
          pubblicato: approva && !!data.consenso_pubblicazione,
          setPasswordUrl,
        }),
      });
    } catch (mailErr) {
      console.error("Universita esito mentor email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, mentor: data });
}

/**
 * Abbina un mentor a una squadra.
 *
 * Solo un mentor approvato: l'abbinamento gli apre i progetti di quella
 * squadra, e la policy che glieli mostra chiede `stato = 'approvata'`.
 * Assegnare una candidatura ancora in valutazione creerebbe una riga che
 * non serve a niente e una persona che non capisce perche non vede nulla.
 */
export async function POST(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const body = (await request.json()) as {
    mentor_id?: string;
    squadra_id?: string;
    nota?: string | null;
  };

  const mentorId = testo(body.mentor_id);
  const squadraId = testo(body.squadra_id);
  const nota = testo(body.nota);

  if (!mentorId) return NextResponse.json({ error: "Mentor non indicato." }, { status: 400 });
  if (!squadraId) return NextResponse.json({ error: "Squadra non indicata." }, { status: 400 });
  if (nota.length > 500) {
    return NextResponse.json({ error: "La nota supera i 500 caratteri." }, { status: 400 });
  }

  const [{ data: mentor }, { data: squadra }] = await Promise.all([
    client
      .from("universita_mentor")
      .select("id, stato")
      .eq("id", mentorId)
      .maybeSingle<{ id: string; stato: string }>(),
    client
      .from("universita_squadre")
      .select("id, nome, stato")
      .eq("id", squadraId)
      .maybeSingle<{ id: string; nome: string; stato: string }>(),
  ]);

  if (!mentor) return NextResponse.json({ error: "Mentor non trovato." }, { status: 404 });
  if (!squadra) return NextResponse.json({ error: "Squadra non trovata." }, { status: 404 });

  if (mentor.stato !== "approvata") {
    return NextResponse.json(
      {
        error:
          "Solo un mentor approvato può seguire una squadra: l'abbinamento è quello che gli apre i progetti del team.",
      },
      { status: 409 },
    );
  }

  // Una squadra sciolta non ha piu un progetto da seguire, e il tempo di un
  // mentor e la risorsa piu scarsa di tutto il percorso.
  if (squadra.stato !== "aperta") {
    return NextResponse.json(
      { error: "Questa squadra non è più attiva." },
      { status: 409 },
    );
  }

  const { data, error: erroreInsert } = await client
    .from("universita_mentor_squadre")
    .insert({ mentor_id: mentorId, squadra_id: squadraId, nota: nota || null })
    .select("id, mentor_id, squadra_id, nota, created_at")
    .maybeSingle<RigaAssegnazione>();

  if (erroreInsert) {
    const messaggio = messaggioErroreDb(erroreInsert.message);
    if (messaggio) return NextResponse.json({ error: messaggio }, { status: 400 });
    // Il vincolo `universita_mentor_squadre_coppia` non e fra quelli che
    // `messaggioErroreDb` traduce, e la frase giusta e una sola: si dice
    // qui invece di lasciar passare un 500 per un doppio clic.
    if (erroreInsert.code === "23505") {
      return NextResponse.json(
        { error: `${squadra.nome} ha già questo mentor.` },
        { status: 409 },
      );
    }
    console.error("Universita mentor squadra insert error:", erroreInsert);
    return NextResponse.json(
      { error: "Non è stato possibile abbinare il mentor alla squadra." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, assegnazione: data });
}

/**
 * Toglie un abbinamento.
 *
 * Cade solo la riga di `universita_mentor_squadre`: il mentor resta
 * approvato e il progetto resta della squadra. E' l'unica cosa che si perde
 * ed e giusto che sia reversibile, perche un abbinamento sbagliato si
 * corregge spostando il mentor su un altro team.
 */
export async function DELETE(request: Request) {
  const { error, status, client } = await getEventAdminClient();
  if (error || !client) return NextResponse.json({ error }, { status });

  const id = await idDaRichiesta(request);
  if (!id) return NextResponse.json({ error: "Abbinamento non indicato." }, { status: 400 });

  const { data, error: erroreDelete } = await client
    .from("universita_mentor_squadre")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (erroreDelete) {
    console.error("Universita mentor squadra delete error:", erroreDelete);
    return NextResponse.json(
      { error: "Non è stato possibile togliere l'abbinamento." },
      { status: 500 },
    );
  }
  if (!data) return NextResponse.json({ error: "Abbinamento non trovato." }, { status: 404 });

  return NextResponse.json({ success: true });
}
