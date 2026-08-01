import { NextResponse } from "next/server";
import { Resend } from "resend";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import { liceiAdminClient, verificaIscrizioniAperte } from "@/lib/eventi/licei-server";
import {
  normalizzaCodice,
  validateIscrizione,
  type IscrizioneInput,
} from "@/lib/eventi/licei-iscrizioni";
import { studenteEmailHtml, studenteEmailSubject } from "@/lib/eventi/licei-email";
import {
  CONSENSO_PRIVACY_STUDENTE_TESTO,
  DICHIARAZIONE_AUTORIZZAZIONE_TESTO,
  SITE_URL,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Un istituto accetta studenti solo dopo che lo staff ne ha confermato
 * l'adesione. Il codice gira per forza di cose in tutta la scuola, quindi
 * senza questo controllo basterebbe conoscerlo per iscriversi a un istituto
 * la cui adesione e ancora da verificare.
 */
const STATI_ADESIONE_CHE_ACCETTANO = new Set(["confermata", "attiva"]);

export async function POST(request: Request) {
  try {
    const client = liceiAdminClient();
    if (!client) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const utente = await utenteCorrente();
    const cancello = await verificaIscrizioniAperte(utente.staff);
    if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

    const body = (await request.json()) as Partial<IscrizioneInput>;

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const errore = validateIscrizione(body);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const input = body as IscrizioneInput;
    const codice = normalizzaCodice(input.codice);
    const email = input.email.toLowerCase().trim();
    const nome = input.nome.trim();
    const cognome = input.cognome.trim();

    // ── L'istituto ──
    const { data: adesione } = await client
      .from("licei_adesioni")
      .select("id, codice, stato, istituto_denominazione, referente_email")
      .eq("codice", codice)
      .maybeSingle();

    if (!adesione) {
      return NextResponse.json(
        {
          error:
            "Codice non riconosciuto. Controlla di averlo copiato bene e chiedilo al tuo docente referente.",
        },
        { status: 404 },
      );
    }

    if (!STATI_ADESIONE_CHE_ACCETTANO.has(adesione.stato)) {
      return NextResponse.json(
        {
          error:
            "L'adesione del tuo istituto è ancora in verifica, quindi le iscrizioni non sono aperte. Il tuo docente referente sarà avvisato appena lo sarà.",
        },
        { status: 409 },
      );
    }

    // ── Gia iscritto? ──
    const { data: esistente } = await client
      .from("licei_iscrizioni")
      .select("id, stato")
      .eq("adesione_id", adesione.id)
      .ilike("email", email)
      .maybeSingle();

    if (esistente) {
      return NextResponse.json(
        {
          error:
            "Con questa email risulti già iscritto a questo istituto. Se pensi ci sia un errore, parlane con il tuo docente referente.",
        },
        { status: 409 },
      );
    }

    // ── Account dello studente ──
    // Serve per accedere alle lezioni, che sono protette da login.
    let userId: string | null = utente.id;
    let setPasswordUrl: string | undefined;

    if (!userId) {
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
          return NextResponse.json(
            { error: "Non e stato possibile creare il tuo account. Riprova." },
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
    }

    const adesso = new Date().toISOString();

    const { error: erroreInsert } = await client.from("licei_iscrizioni").insert({
      adesione_id: adesione.id,
      user_id: userId,
      nome,
      cognome,
      email,
      classe: input.classe.trim(),
      anno_corso: Number(input.anno_corso),
      consenso_privacy: true,
      consenso_privacy_ts: adesso,
      dichiara_autorizzazione: true,
      dichiarazioni_testo: {
        privacy: CONSENSO_PRIVACY_STUDENTE_TESTO,
        autorizzazione: DICHIARAZIONE_AUTORIZZAZIONE_TESTO,
      },
    });

    if (erroreInsert) {
      if (erroreInsert.code === "23505") {
        return NextResponse.json(
          { error: "Con questa email risulti già iscritto a questo istituto." },
          { status: 409 },
        );
      }
      console.error("Licei iscrizione insert error:", erroreInsert);
      return NextResponse.json(
        { error: "Non e stato possibile registrare l'iscrizione. Riprova." },
        { status: 500 },
      );
    }

    // ── Email allo studente ──
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: email,
          subject: studenteEmailSubject(),
          html: studenteEmailHtml({
            nome,
            istituto: adesione.istituto_denominazione,
            setPasswordUrl,
          }),
        });
      } catch (mailErr) {
        console.error("Licei student email failed:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      istituto: adesione.istituto_denominazione,
    });
  } catch (err) {
    console.error("Licei iscrizione error:", err);
    return NextResponse.json(
      { error: "Iscrizione non riuscita. Riprova." },
      { status: 500 },
    );
  }
}
