/**
 * POST della pre-iscrizione al bando universitario.
 *
 * Sullo stesso modello della rotta del bando startup, senza la parte di
 * upload: in questa fase non si carica nulla.
 *
 * Una candidatura per indirizzo. Un secondo invio con la stessa email non
 * aggiorna: viene rifiutato. La rotta è pubblica e senza autenticazione,
 * quindi un aggiornamento silenzioso permetterebbe a chiunque conosca un
 * indirizzo di riscrivere la candidatura di quella persona, e di leggerne il
 * codice nella risposta. Stessa scelta della rotta gemella delle iscrizioni
 * dei licei, che rifiuta i duplicati con un 409.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  leggiConfigUniversita,
  universitaAdminClient,
  verificaFinestraUniversita,
} from "@/lib/eventi/universita-server";
import {
  generateCodiceUniversita,
  validateUniversita,
  type UniversitaInput,
} from "@/lib/eventi/universita";
import {
  universitaEmailHtml,
  universitaEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  ACCETTAZIONE_BANDO_TESTO,
  CONSENSO_PRIVACY_UNIVERSITA_TESTO,
  CONTATTI_UNIVERSITA,
  SITE_URL,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  try {
    // Il cancello sta qui, non solo in pagina: nascondere il modulo non
    // impedisce a nessuno di chiamare la rotta.
    const finestra = verificaFinestraUniversita();
    if (!finestra.ok) {
      return NextResponse.json({ error: finestra.errore }, { status: 403 });
    }

    const client = universitaAdminClient();
    if (!client) {
      console.error("Universita: service role non configurata");
      return NextResponse.json(
        { error: "Il servizio non è disponibile al momento. Riprova più tardi." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Partial<UniversitaInput> & { website?: string };

    // Honeypot compilato: successo silenzioso, nessuna scrittura e nessuna
    // email. Come nelle altre rotte pubbliche del sito.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true, codice: "" });
    }

    const input: UniversitaInput = {
      nome: str(body.nome),
      cognome: str(body.cognome),
      email: str(body.email).toLowerCase(),
      universita: str(body.universita),
      corso_studi: str(body.corso_studi),
      livello: str(body.livello),
      area: str(body.area),
      area_altro: str(body.area_altro),
      interessi: str(body.interessi),
      accetta_bando: body.accetta_bando === true,
      consenso_privacy: body.consenso_privacy === true,
    };

    const errore = validateUniversita(input);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    // Confronto esatto, non `ilike`: `%` e `_` sono caratteri validi nella
    // parte locale di un indirizzo, e con `ilike` arriverebbero a Postgres
    // come jolly, quindi una richiesta potrebbe agganciare la riga di
    // un'altra persona. L'email è già normalizzata a minuscolo qui sopra e la
    // tabella ha l'indice unico su lower(email).
    const { data: esistente } = await client
      .from("universita_candidature")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (esistente) {
      return NextResponse.json(
        {
          error: `Con questa email risulta già una candidatura. Se devi correggere qualcosa, scrivi a ${CONTATTI_UNIVERSITA.fondazione.email}.`,
        },
        { status: 409 },
      );
    }

    // ── Account del candidato ──
    // Serve per entrare nel corso, che e protetto da login, e per la propria
    // area del percorso. Fino alla fase 2 questa rotta non lo creava: il
    // candidato riceveva un codice e non aveva nessun posto dove usarlo.
    //
    // Si cerca prima un profilo con quella email, perche chi e gia registrato
    // sul sito, per il portale o per un altro bando, non deve ritrovarsi un
    // secondo account con lo stesso indirizzo.
    let userId: string | null = null;
    let setPasswordUrl: string | undefined;

    const { data: profilo } = await client
      .from("profiles")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (profilo?.id) {
      userId = profilo.id as string;
    } else {
      const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
        user_metadata: { full_name: `${input.nome} ${input.cognome}` },
      });
      if (erroreCreazione || !creato.user) {
        console.error("Universita createUser error:", erroreCreazione);
        return NextResponse.json(
          { error: "Non è stato possibile creare il tuo account. Riprova." },
          { status: 500 },
        );
      }
      userId = creato.user.id;

      const { data: link } = await client.auth.admin.generateLink({
        type: "recovery",
        email: input.email,
        options: { redirectTo: `${SITE_URL}/auth/update-password` },
      });
      setPasswordUrl = link?.properties?.action_link;
    }

    // Con `conferma_automatica` a `si` la candidatura entra subito nel
    // percorso. Il default della colonna a database resta `candidata`: e la
    // rete per le righe che non passano da qui.
    const config = await leggiConfigUniversita();
    const stato = config.conferma_automatica === "si" ? "confermata" : "candidata";

    const codice = generateCodiceUniversita();
    const { error: erroreInsert } = await client
      .from("universita_candidature")
      .insert({
        user_id: userId,
        stato,
        nome: input.nome,
        cognome: input.cognome,
        email: input.email,
        universita: input.universita,
        corso_studi: input.corso_studi,
        livello: input.livello,
        area: input.area,
        // Il campo libero ha senso solo insieme ad "altro".
        area_altro: input.area === "altro" ? input.area_altro : null,
        interessi: input.interessi || null,
        accetta_bando: input.accetta_bando,
        consenso_privacy: input.consenso_privacy,
        // I testi dei consensi sono registrati come erano al momento
        // dell'invio: se domani cambiano, resta traccia di cosa fu accettato.
        accetta_bando_testo: ACCETTAZIONE_BANDO_TESTO,
        consenso_privacy_testo: CONSENSO_PRIVACY_UNIVERSITA_TESTO,
        codice,
      });

    if (erroreInsert) {
      // 23505: due invii simultanei della stessa email. Stessa risposta del
      // duplicato trovato sopra, per non distinguere i due casi.
      if (erroreInsert.code === "23505") {
        return NextResponse.json(
          {
            error: `Con questa email risulta già una candidatura. Se devi correggere qualcosa, scrivi a ${CONTATTI_UNIVERSITA.fondazione.email}.`,
          },
          { status: 409 },
        );
      }
      console.error("Università insert error:", erroreInsert);
      return NextResponse.json(
        { error: "Non è stato possibile registrare la candidatura. Riprova." },
        { status: 500 },
      );
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: input.email,
          subject: universitaEmailSubject(),
          html: universitaEmailHtml({ nome: input.nome, codice, setPasswordUrl }),
        });
      } catch (mailErr) {
        // La candidatura è salvata: un problema email non deve farla fallire.
        console.error("Università confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true, codice });
  } catch (err) {
    console.error("Università submission error:", err);
    return NextResponse.json(
      { error: "Si è verificato un errore. Riprova." },
      { status: 500 },
    );
  }
}
