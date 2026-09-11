/**
 * POST della pre-iscrizione al bando universitario.
 *
 * Sullo stesso modello della rotta del bando startup, senza la parte di
 * upload: in questa fase non si carica nulla. Un secondo invio con la stessa
 * email aggiorna la candidatura esistente invece di crearne una doppia.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
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
        { error: "Il servizio non e disponibile al momento. Riprova piu tardi." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Partial<UniversitaInput>;

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

    const riga = {
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
    };

    const { data: esistente } = await client
      .from("universita_candidature")
      .select("id, codice")
      .ilike("email", input.email)
      .maybeSingle();

    let codice: string;
    const aggiornata = Boolean(esistente);

    if (esistente) {
      codice = esistente.codice;
      const { error: erroreUpdate } = await client
        .from("universita_candidature")
        .update(riga)
        .eq("id", esistente.id);
      if (erroreUpdate) {
        console.error("Universita update error:", erroreUpdate);
        return NextResponse.json(
          { error: "Non e stato possibile aggiornare la candidatura. Riprova." },
          { status: 500 },
        );
      }
    } else {
      codice = generateCodiceUniversita();
      const { error: erroreInsert } = await client
        .from("universita_candidature")
        .insert({ ...riga, codice });
      if (erroreInsert) {
        // 23505: due invii simultanei della stessa email.
        if (erroreInsert.code === "23505") {
          return NextResponse.json(
            { error: "Esiste gia una candidatura con questa email." },
            { status: 409 },
          );
        }
        console.error("Universita insert error:", erroreInsert);
        return NextResponse.json(
          { error: "Non e stato possibile registrare la candidatura. Riprova." },
          { status: 500 },
        );
      }
    }

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: input.email,
          subject: universitaEmailSubject(aggiornata),
          html: universitaEmailHtml({
            nome: input.nome,
            codice,
            aggiornata,
          }),
        });
      } catch (mailErr) {
        // La candidatura e salvata: un problema email non deve farla fallire.
        console.error("Universita confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true, codice, aggiornata });
  } catch (err) {
    console.error("Universita submission error:", err);
    return NextResponse.json(
      { error: "Si e verificato un errore. Riprova." },
      { status: 500 },
    );
  }
}
