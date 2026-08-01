import { NextResponse } from "next/server";
import { Resend } from "resend";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import { liceiAdminClient, verificaAdesioniAperte } from "@/lib/eventi/licei-server";
import {
  generateCodiceAdesione,
  normalizzaMeccanografico,
  totaleStudenti,
  validateAdesione,
  type AdesioneInput,
} from "@/lib/eventi/licei";
import { liceiEmailHtml, liceiEmailSubject } from "@/lib/eventi/licei-email";
import {
  CONSENSO_MARKETING_LICEI_TESTO,
  CONSENSO_PRIVACY_LICEI_TESTO,
  DICHIARAZIONE_ACCETTAZIONE_LICEI_TESTO,
  DICHIARAZIONE_POTERI_TESTO,
  IMPEGNI_ISTITUTO,
  NOTA_DATI_STUDENTI,
  SITE_URL,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const int = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export async function POST(request: Request) {
  try {
    const client = liceiAdminClient();
    if (!client) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const utente = await utenteCorrente();
    const cancello = await verificaAdesioniAperte(utente.staff);
    if (!cancello.ok) return NextResponse.json({ error: cancello.errore }, { status: 403 });

    const body = (await request.json()) as Partial<AdesioneInput>;

    // Honeypot compilato: successo silenzioso, nessuna scrittura.
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true, codice: "" });
    }

    const errore = validateAdesione(body);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const input = body as AdesioneInput;
    const meccanografico = normalizzaMeccanografico(input.codice_meccanografico);
    const referenteEmail = input.referente_email.toLowerCase().trim();
    const istituto = input.istituto_denominazione.trim();
    const fullName = `${input.referente_nome.trim()} ${input.referente_cognome.trim()}`.trim();

    // ── L'istituto ha gia aderito? ──
    // La chiave e la scuola, non il docente: due referenti della stessa scuola
    // devono collidere. Aggiornare puo farlo solo chi ha aderito, autenticato,
    // altrimenti basterebbe conoscere un codice meccanografico (che e pubblico)
    // per riscrivere l'adesione di un altro istituto.
    const { data: esistente } = await client
      .from("licei_adesioni")
      .select("id, user_id, codice, referente_email")
      .eq("codice_meccanografico", meccanografico)
      .maybeSingle();

    if (esistente && !utente.staff && (!utente.id || utente.id !== esistente.user_id)) {
      return NextResponse.json(
        {
          error:
            "Questo istituto ha già aderito. Se sei il docente referente, accedi con la tua email per aggiornare l'adesione. Se il referente è cambiato, scrivi a info@bioergotech.org.",
        },
        { status: 409 },
      );
    }

    // ── Account del docente referente ──
    // Solo il docente. Nessun account viene creato per gli studenti in questa
    // fase, e nessun dato di minori entra nel database.
    let userId: string | null = utente.id;
    let setPasswordUrl: string | undefined;

    if (!userId) {
      const { data: profilo } = await client
        .from("profiles")
        .select("id")
        .eq("email", referenteEmail)
        .maybeSingle();

      if (profilo?.id) {
        userId = profilo.id;
      } else {
        const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
          email: referenteEmail,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (erroreCreazione || !creato.user) {
          return NextResponse.json(
            { error: "Non e stato possibile creare l'account del referente. Riprova." },
            { status: 500 },
          );
        }
        userId = creato.user.id;

        const { data: link } = await client.auth.admin.generateLink({
          type: "recovery",
          email: referenteEmail,
          options: { redirectTo: `${SITE_URL}/auth/update-password` },
        });
        setPasswordUrl = link?.properties?.action_link;
      }
    }

    const adesso = new Date().toISOString();

    const riga = {
      user_id: userId,
      istituto_denominazione: istituto,
      codice_meccanografico: meccanografico,
      istituto_comune: input.istituto_comune.trim(),
      istituto_provincia: str(input.istituto_provincia) ?? "TA",
      istituto_email: input.istituto_email.toLowerCase().trim(),
      istituto_sito: str(input.istituto_sito),
      dirigente_nome: str(input.dirigente_nome),

      referente_nome: input.referente_nome.trim(),
      referente_cognome: input.referente_cognome.trim(),
      referente_email: referenteEmail,
      referente_telefono: input.referente_telefono.trim(),
      referente_materia: str(input.referente_materia),

      studenti_terza: int(input.studenti_terza) ?? 0,
      studenti_quarta: int(input.studenti_quarta) ?? 0,
      studenti_quinta: int(input.studenti_quinta) ?? 0,
      classi_coinvolte: str(input.classi_coinvolte),
      evento_studenti_stimati: int(input.evento_studenti_stimati),
      evento_docenti_stimati: int(input.evento_docenti_stimati),
      note: str(input.note),

      impegno_referente: true,
      impegno_promozione: true,
      impegno_evento: true,
      impegno_consensi: true,

      dichiarazione_poteri: true,
      accetta_bando: true,
      consenso_privacy: true,
      consenso_privacy_ts: adesso,
      consenso_marketing: !!input.consenso_marketing,
      consenso_marketing_ts: input.consenso_marketing ? adesso : null,
      consenso_marketing_testo: input.consenso_marketing ? CONSENSO_MARKETING_LICEI_TESTO : null,
      // Testo esatto accettato, congelato con l'adesione.
      dichiarazioni_testo: {
        impegni: Object.fromEntries(IMPEGNI_ISTITUTO.map((i) => [i.campo, i.testo])),
        poteri: DICHIARAZIONE_POTERI_TESTO,
        accettazione: DICHIARAZIONE_ACCETTAZIONE_LICEI_TESTO,
        privacy: CONSENSO_PRIVACY_LICEI_TESTO,
        nota_dati_studenti: NOTA_DATI_STUDENTI,
      },
    };

    let codice: string;
    const aggiornata = Boolean(esistente);

    if (esistente) {
      codice = esistente.codice;
      // stato e note_staff restano fuori: una modifica del referente non
      // azzera il lavoro di verifica gia fatto dallo staff.
      const { error: erroreUpdate } = await client
        .from("licei_adesioni")
        .update(riga)
        .eq("id", esistente.id);
      if (erroreUpdate) {
        console.error("Licei adesione update error:", erroreUpdate);
        return NextResponse.json(
          { error: "Non e stato possibile aggiornare l'adesione. Riprova." },
          { status: 500 },
        );
      }
    } else {
      codice = generateCodiceAdesione();
      const { error: erroreInsert } = await client
        .from("licei_adesioni")
        .insert({ ...riga, codice });
      if (erroreInsert) {
        if (erroreInsert.code === "23505") {
          return NextResponse.json(
            {
              error:
                "Questo istituto ha già aderito. Se sei il docente referente, accedi con la tua email per aggiornare l'adesione.",
            },
            { status: 409 },
          );
        }
        console.error("Licei adesione insert error:", erroreInsert);
        return NextResponse.json(
          { error: "Non e stato possibile registrare l'adesione. Riprova." },
          { status: 500 },
        );
      }
    }

    // ── Bacino marketing, come per il resto del sito ──
    if (input.consenso_marketing) {
      await client.from("newsletter_subscribers").upsert(
        {
          email: referenteEmail,
          full_name: fullName,
          source: "bando-licei",
          is_active: true,
          subscribed_at: adesso,
        },
        { onConflict: "email" },
      );
    }

    // ── Email di conferma ──
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: referenteEmail,
          subject: liceiEmailSubject(aggiornata),
          html: liceiEmailHtml({
            referente: `${input.referente_nome.trim()} ${input.referente_cognome.trim()}`,
            istituto,
            codice,
            studentiPrevisti: totaleStudenti(input),
            aggiornata,
            setPasswordUrl,
          }),
        });
      } catch (mailErr) {
        // L'adesione e salvata: un problema email non deve farla fallire.
        console.error("Licei confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true, codice, aggiornata });
  } catch (err) {
    console.error("Licei adesione error:", err);
    return NextResponse.json(
      { error: "Invio dell'adesione non riuscito. Riprova." },
      { status: 500 },
    );
  }
}
