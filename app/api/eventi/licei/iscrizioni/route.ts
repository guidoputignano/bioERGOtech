import { NextResponse } from "next/server";
import { Resend } from "resend";
import { utenteCorrente } from "@/lib/eventi/bando-server";
import { erroreSchemaMancante, liceiAdminClient, verificaIscrizioniAperte } from "@/lib/eventi/licei-server";
import { escapeLike } from "@/lib/eventi/licei-docenti";
import { altroRuoloDellAccount } from "@/lib/eventi/licei-correggi-email";
import {
  normalizzaCodice,
  validateIscrizione,
  type IscrizioneInput,
} from "@/lib/eventi/licei-iscrizioni";
import { studenteEmailHtml, studenteEmailSubject } from "@/lib/eventi/licei-email";
import {
  ACCETTAZIONE_REGOLAMENTO_TESTO,
  CONSENSO_NEWSLETTER_STUDENTE_TESTO,
  CONSENSO_PRIVACY_STUDENTE_TESTO,
  DICHIARAZIONE_ETA_TESTO,
  SITE_URL,
  STATI_ADESIONE_CHE_ACCETTANO,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";
import { INFORMATIVA_STUDENTI, REGOLAMENTO } from "@/app/eventi/vivere-piu-a-lungo/licei/documenti";

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

    /**
     * Un istituto accetta studenti solo dopo che lo staff ne ha confermato
     * l'adesione. Il codice gira per forza di cose in tutta la scuola, quindi
     * senza questo controllo basterebbe conoscerlo per iscriversi a un istituto
     * la cui adesione e ancora da verificare.
     */
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
    // `escapeLike`: in un pattern di ilike "_" vale qualsiasi carattere, e
    // "mario_rossi@" risultava gia iscritto se c'era "mario.rossi@".
    const { data: esistente } = await client
      .from("licei_iscrizioni")
      .select("id, stato")
      .eq("adesione_id", adesione.id)
      .ilike("email", escapeLike(email))
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

    // ── Quale account lega l'iscrizione ──
    // La sessione aperta conta solo se e quella dello studente, cioe se ha
    // la stessa email che ha scritto. Su un computer della scuola, o su
    // quello del docente, puo essere collegato il docente: prima
    // l'iscrizione di ogni studente finiva sull'account del docente, gli
    // studenti "entravano con il suo nome" e non ricevevano mai il link
    // della password. Altrimenti vale l'account che ha quell'email, se c'e.
    const sessioneSua = !!utente.id && (utente.email ?? "").trim().toLowerCase() === email;
    const { data: profilo } = sessioneSua
      ? { data: null }
      : await client.from("profiles").select("id").eq("email", email).maybeSingle();
    const accountDaLegare: string | null = sessioneSua ? utente.id : (profilo?.id ?? null);

    // ── Un docente non si iscrive come studente ──
    // Con l'email o l'account di un docente del progetto o di un referente,
    // lo stesso account avrebbe la vista da docente e quella da studente; la
    // guardia ferma il docente del progetto e gli toglierebbe l'accesso, e un
    // referente si ritroverebbe iscritto come studente della sua scuola.
    // Prima della migrazione 20261215000000 la tabella dei docenti non c'e e
    // quel controllo non serve.
    const nessuno = Promise.resolve({ data: [], error: null });
    const [docentePerEmail, docentePerAccount, referentePerEmail, referentePerAccount] = await Promise.all([
      client
        .from("licei_docenti")
        .select("id")
        .ilike("email", escapeLike(email))
        .in("stato", ["invitato", "attivo"])
        .limit(1),
      accountDaLegare
        ? client
            .from("licei_docenti")
            .select("id")
            .eq("user_id", accountDaLegare)
            .in("stato", ["invitato", "attivo"])
            .limit(1)
        : nessuno,
      client.from("licei_adesioni").select("id").ilike("referente_email", escapeLike(email)).limit(1),
      accountDaLegare ? client.from("licei_adesioni").select("id").eq("user_id", accountDaLegare).limit(1) : nessuno,
    ]);
    const erroreDocenti = [
      docentePerEmail.error,
      docentePerAccount.error,
      referentePerEmail.error,
      referentePerAccount.error,
    ].find((e) => e && !erroreSchemaMancante(e, "tabella"));
    if (erroreDocenti) {
      console.error("Licei iscrizione: controllo docenti fallito:", erroreDocenti.message);
      return NextResponse.json(
        { error: "Non è stato possibile registrare l'iscrizione. Riprova." },
        { status: 500 },
      );
    }
    if (
      [docentePerEmail, docentePerAccount, referentePerEmail, referentePerAccount].some(
        (r) => (r.data ?? []).length > 0,
      )
    ) {
      return NextResponse.json(
        {
          error: utente.id && !sessioneSua
            ? "Con questa email non è possibile iscriversi come studente. Se stai usando un computer su cui è collegato il tuo docente, esci e scrivi la tua email."
            : "Con questa email non è possibile iscriversi come studente. Se pensi ci sia un errore, scrivi a info@bioergotech.org.",
        },
        { status: 409 },
      );
    }

    // ── Un account con un altro ruolo non diventa uno studente ──
    // Il modulo lega l'account che trova per email. Senza questo controllo
    // chiunque poteva iscrivere come studente l'account di un commissario,
    // di un membro della Fondazione o di un partecipante dell'universita,
    // conoscendone solo l'email: l'account cambiava area, e la correzione
    // dell'email dalla console poteva poi spostarlo. Lo staff in anteprima,
    // con la propria sessione, passa.
    if (accountDaLegare && !(sessioneSua && utente.staff)) {
      const ruolo = await altroRuoloDellAccount(client, accountDaLegare);
      if (ruolo === undefined) {
        return NextResponse.json(
          { error: "Non è stato possibile registrare l'iscrizione. Riprova." },
          { status: 500 },
        );
      }
      // Un'altra iscrizione ai licei non conta qui: e sempre uno studente.
      if (ruolo && ruolo !== "iscrizione") {
        return NextResponse.json(
          {
            error:
              "Con questa email non è possibile iscriversi come studente. Se pensi ci sia un errore, scrivi a info@bioergotech.org.",
          },
          { status: 409 },
        );
      }
    }

    // ── Account dello studente ──
    // Serve per accedere alle lezioni, che sono protette da login.
    let userId: string | null = sessioneSua ? utente.id : null;
    let setPasswordUrl: string | undefined;

    if (!userId) {
      if (profilo?.id) {
        userId = profilo.id;
        // L'email ha gia un account sul sito (un tentativo precedente, un
        // altro modulo). Se non ha mai fatto l'accesso, una password non ce
        // l'ha: senza link, l'email diceva "imposta la password" e lo
        // lasciava senza modo di farlo. Il link va solo a quella casella.
        const { data: esistente } = await client.auth.admin.getUserById(profilo.id);
        if (esistente?.user && !esistente.user.last_sign_in_at) {
          const { data: link } = await client.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: `${SITE_URL}/auth/update-password` },
          });
          setPasswordUrl = link?.properties?.action_link;
        }
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
      // La colonna dichiara_autorizzazione resta per le iscrizioni fatte con il
      // modello precedente (modulo dei genitori). Le dichiarazioni di adesso
      // vivono nel jsonb, con il testo esatto mostrato e l'ora: così non serve
      // una migrazione per registrarle.
      dichiara_autorizzazione: false,
      dichiarazioni_testo: {
        privacy: CONSENSO_PRIVACY_STUDENTE_TESTO,
        eta_14: DICHIARAZIONE_ETA_TESTO,
        regolamento: ACCETTAZIONE_REGOLAMENTO_TESTO,
        newsletter: input.consenso_newsletter ? CONSENSO_NEWSLETTER_STUDENTE_TESTO : null,
        // Quale versione dei documenti era in vigore quando si è iscritto.
        versioni: {
          informativa_studenti: INFORMATIVA_STUDENTI.aggiornato,
          regolamento: REGOLAMENTO.aggiornato,
        },
        ts: adesso,
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
        { error: "Non è stato possibile registrare l'iscrizione. Riprova." },
        { status: 500 },
      );
    }

    // ── Newsletter, solo se scelta: casella facoltativa e mai preselezionata ──
    if (input.consenso_newsletter) {
      await client.from("newsletter_subscribers").upsert(
        {
          email,
          full_name: `${nome} ${cognome}`,
          source: "corso-licei",
          is_active: true,
          subscribed_at: adesso,
        },
        { onConflict: "email" },
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
