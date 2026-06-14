import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  validateRegistration,
  generateCodice,
  type RegistrationInput,
  type RegistrationResult,
} from "@/lib/eventi/registration";
import { confirmationEmailHtml, confirmationEmailSubject } from "@/lib/eventi/email";
import {
  SESSIONS,
  ARCHIVE_MODE,
  SITE_URL,
  CONSENSO_MARKETING_TESTO,
} from "@/app/eventi/vivere-piu-a-lungo/content";

const admin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

export async function POST(request: Request) {
  try {
    if (ARCHIVE_MODE) {
      return NextResponse.json({ error: "Le iscrizioni sono chiuse." }, { status: 403 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const body = (await request.json()) as Partial<RegistrationInput>;
    const allowedSlugs = SESSIONS.map((s) => s.slug);

    const validationError = validateRegistration(body, allowedSlugs);
    if (validationError) {
      // Honeypot compilato: rispondiamo come un successo silenzioso senza scrivere.
      if (body.website && body.website.trim() !== "") {
        return NextResponse.json({ success: true, sessions: [] });
      }
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const input = body as RegistrationInput;
    const email = input.email.toLowerCase().trim();
    const fullName = `${input.nome.trim()} ${input.cognome.trim()}`.trim();
    const client = admin();

    // ── Account vero obbligatorio: collega o crea un utente del Member Portal ──
    let userId: string | null = null;
    let setPasswordUrl: string | undefined;

    // 1. Utente gia loggato: colleghiamo l'iscrizione al suo account.
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      userId = currentUser.id;
    } else {
      // 2. Esiste gia un account con questa email?
      const { data: existingProfile } = await client
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        // 3. Crea un nuovo account e prepara il link per impostare la password.
        const { data: created, error: createError } = await client.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createError || !created.user) {
          return NextResponse.json(
            { error: "Non e stato possibile creare l'account. Riprova." },
            { status: 500 },
          );
        }
        userId = created.user.id;

        const { data: linkData } = await client.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${SITE_URL}/auth/update-password` },
        });
        setPasswordUrl = linkData?.properties?.action_link;
      }
    }

    // ── Iscrizione atomica con controllo capienza (RPC SECURITY DEFINER) ──
    const { data: rpcData, error: rpcError } = await client.rpc("event_register", {
      p_user_id: userId,
      p_nome: input.nome.trim(),
      p_cognome: input.cognome.trim(),
      p_email: email,
      p_telefono: input.telefono?.trim() || null,
      p_categoria: input.categoria,
      p_organizzazione: input.organizzazione?.trim() || null,
      p_classe: input.classe?.trim() || null,
      p_startup_name: input.startup_name?.trim() || null,
      p_startup_url: input.startup_url?.trim() || null,
      p_startup_desc: input.startup_desc?.trim() || null,
      p_referente: input.referente?.trim() || null,
      p_note: input.note?.trim() || null,
      p_marketing: !!input.consenso_marketing,
      p_marketing_testo: CONSENSO_MARKETING_TESTO,
      p_codice: generateCodice(),
      p_session_slugs: input.sessioni,
    });

    if (rpcError) {
      console.error("event_register RPC error:", rpcError);
      return NextResponse.json(
        { error: "Non e stato possibile completare l'iscrizione. Riprova." },
        { status: 500 },
      );
    }

    const result = rpcData as RegistrationResult;

    // ── Bacino marketing unificato: stesso pool del resto del sito ──
    if (input.consenso_marketing) {
      await client.from("newsletter_subscribers").upsert(
        {
          email,
          full_name: fullName,
          source: "evento-vivere-piu-a-lungo",
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    }

    // ── Email di conferma con codice e QR ──
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: email,
          subject: confirmationEmailSubject(),
          html: confirmationEmailHtml({
            nome: input.nome.trim(),
            codice: result.codice,
            sessions: result.sessions,
            setPasswordUrl,
          }),
        });
      } catch (mailErr) {
        // L'iscrizione e salvata: un problema email non deve far fallire la richiesta.
        console.error("Confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      codice: result.codice,
      sessions: result.sessions,
    });
  } catch (err) {
    console.error("Event registration error:", err);
    return NextResponse.json({ error: "Iscrizione non riuscita. Riprova." }, { status: 500 });
  }
}
