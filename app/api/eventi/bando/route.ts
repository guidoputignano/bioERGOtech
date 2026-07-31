import { NextResponse } from "next/server";
import { Resend } from "resend";
import { BANDO_BUCKET, bandoAdminClient, utenteCorrente, verificaFinestra } from "@/lib/eventi/bando-server";
import {
  avvisiCategoria,
  generateCodiceBando,
  validateBando,
  type AllegatoCaricato,
  type BandoInput,
} from "@/lib/eventi/bando";
import { bandoEmailHtml, bandoEmailSubject } from "@/lib/eventi/bando-email";
import {
  ALLEGATI,
  CONSENSO_MARKETING_BANDO_TESTO,
  CONSENSO_PRIVACY_BANDO_TESTO,
  DICHIARAZIONE_ACCETTAZIONE_TESTO,
  DICHIARAZIONE_CONCORSUALI_TESTO,
  DICHIARAZIONE_PUBBLICITA_TESTO,
  DICHIARAZIONE_VERIDICITA_TESTO,
  SITE_URL,
} from "@/app/eventi/vivere-piu-a-lungo/bando/content";

const str = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const allegato = (a: AllegatoCaricato | null | undefined) =>
  a?.path ? { path: a.path, nome: a.nome ?? "", size: a.size ?? 0 } : null;

export async function POST(request: Request) {
  try {
    const client = bandoAdminClient();
    if (!client) {
      return NextResponse.json({ error: "Configurazione server mancante." }, { status: 500 });
    }

    const utente = await utenteCorrente();
    const finestra = verificaFinestra(utente.staff);
    if (!finestra.ok) return NextResponse.json({ error: finestra.errore }, { status: 403 });

    const body = (await request.json()) as Partial<BandoInput>;

    // Honeypot compilato: successo silenzioso, nessuna scrittura.
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true, codice: "" });
    }

    const errore = validateBando(body);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const input = body as BandoInput;
    const draft = input.draft_id.toLowerCase();
    const email = input.referente_email.toLowerCase().trim();
    const progetto = input.progetto_nome.trim();
    const fullName = `${input.referente_nome.trim()} ${input.referente_cognome.trim()}`.trim();

    // ── Gli allegati dichiarati devono esistere davvero nello storage ──
    const dichiarati: AllegatoCaricato[] = [
      input.file_descrizione,
      input.file_pitch_deck,
      input.file_documentazione,
      input.file_prospetto,
      ...(input.file_extra ?? []),
    ].filter((f): f is AllegatoCaricato => Boolean(f?.path));

    if (dichiarati.length > 0) {
      const { data: presenti } = await client.storage
        .from(BANDO_BUCKET)
        .list(`candidature/${draft}`, { limit: 100 });
      const nomiPresenti = new Set((presenti ?? []).map((f) => f.name));
      for (const f of dichiarati) {
        if (!nomiPresenti.has(f.path.split("/").pop() ?? "")) {
          return NextResponse.json(
            { error: "Uno degli allegati non risulta caricato. Ricaricalo e riprova." },
            { status: 400 },
          );
        }
      }
    }

    // ── Account nel Member Portal: collega o crea, come per le iscrizioni ──
    let userId: string | null = utente.id;
    let setPasswordUrl: string | undefined;

    if (!userId) {
      const { data: profiloEsistente } = await client
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profiloEsistente?.id) {
        userId = profiloEsistente.id;
      } else {
        const { data: creato, error: erroreCreazione } = await client.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (erroreCreazione || !creato.user) {
          return NextResponse.json(
            { error: "Non e stato possibile creare l'account. Riprova." },
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

    // ── Candidatura gia presente per questo progetto e questa email? ──
    // Aggiornarla puo farlo solo il titolare, autenticato. Senza questo
    // controllo basterebbe conoscere email e nome del progetto per
    // sovrascrivere la candidatura di qualcun altro.
    const dedupKey = `${email}::${progetto.toLowerCase()}`;
    const { data: esistente } = await client
      .from("bando_applications")
      .select("id, user_id, codice")
      .eq("dedup_key", dedupKey)
      .maybeSingle();

    if (esistente && !utente.staff && (!utente.id || utente.id !== esistente.user_id)) {
      return NextResponse.json(
        {
          error:
            "Esiste gia una candidatura per questo progetto con questa email. Accedi al Member Portal con l'email del referente per aggiornarla, oppure scrivi a info@bioergotech.org.",
        },
        { status: 409 },
      );
    }

    const avvisi = avvisiCategoria(input);

    const riga = {
      user_id: userId,
      draft_id: draft,
      categoria: input.categoria,
      categoria_avvisi: avvisi,

      progetto_nome: progetto,
      progetto_sintesi: input.progetto_sintesi.trim(),
      ambiti: input.ambiti,

      organizzazione: str(input.organizzazione),
      forma_giuridica: str(input.forma_giuridica),
      partita_iva: str(input.partita_iva),
      data_costituzione: str(input.data_costituzione),
      paese: input.paese.trim(),
      citta: input.citta.trim(),
      sito_web: str(input.sito_web),

      referente_nome: input.referente_nome.trim(),
      referente_cognome: input.referente_cognome.trim(),
      referente_ruolo: str(input.referente_ruolo),
      referente_email: email,
      referente_telefono: input.referente_telefono.trim(),
      referente_maggiorenne: !!input.referente_maggiorenne,

      team_dimensione: num(input.team_dimensione),
      team_descrizione: input.team_descrizione.trim(),

      problema: input.problema.trim(),
      soluzione: input.soluzione.trim(),
      stato_avanzamento: input.stato_avanzamento.trim(),
      impatto_atteso: input.impatto_atteso.trim(),
      aspetti_etici: input.aspetti_etici.trim(),

      // I campi delle categorie non scelte restano vuoti: un cambio di
      // categoria in fase di modifica non deve lasciare dati orfani.
      a_stadio: input.categoria === "A" ? str(input.a_stadio) : null,
      a_ente_ricerca: input.categoria === "A" ? str(input.a_ente_ricerca) : null,

      b_stato_prototipo: input.categoria === "B" ? str(input.b_stato_prototipo) : null,
      b_validazione: input.categoria === "B" ? str(input.b_validazione) : null,
      b_raccolta_totale_eur: input.categoria === "B" ? num(input.b_raccolta_totale_eur) : null,
      b_modello_business: input.categoria === "B" ? str(input.b_modello_business) : null,

      c_raccolta_totale_eur: input.categoria === "C" ? num(input.c_raccolta_totale_eur) : null,
      c_ricavi_ultimo_anno_eur: input.categoria === "C" ? num(input.c_ricavi_ultimo_anno_eur) : null,
      c_strumenti: input.categoria === "C" ? input.c_strumenti ?? [] : [],
      c_round: input.categoria === "C" ? str(input.c_round) : null,
      c_obiettivi: input.categoria === "C" ? input.c_obiettivi ?? [] : [],
      c_trazione: input.categoria === "C" ? str(input.c_trazione) : null,

      file_descrizione: allegato(input.file_descrizione),
      file_pitch_deck: allegato(input.file_pitch_deck),
      file_documentazione: allegato(input.file_documentazione),
      file_prospetto: allegato(input.file_prospetto),
      file_extra: (input.file_extra ?? []).map((f) => allegato(f)).filter(Boolean),

      video_url: str(input.video_url),
      pubblicazioni: str(input.pubblicazioni),
      brevetti: str(input.brevetti),

      presenza_taranto: !!input.presenza_taranto,
      edizioni_precedenti: !!input.edizioni_precedenti,
      edizioni_avanzamenti: input.edizioni_precedenti ? str(input.edizioni_avanzamenti) : null,
      no_procedure_concorsuali:
        input.categoria === "A" ? null : !!input.no_procedure_concorsuali,

      dichiarazione_veridicita: true,
      accetta_bando: true,
      presa_atto_pubblicita: true,
      consenso_privacy: true,
      consenso_privacy_ts: new Date().toISOString(),
      consenso_marketing: !!input.consenso_marketing,
      consenso_marketing_ts: input.consenso_marketing ? new Date().toISOString() : null,
      consenso_marketing_testo: input.consenso_marketing ? CONSENSO_MARKETING_BANDO_TESTO : null,
      // Il testo esatto accettato, congelato con la candidatura: se un domani
      // cambiamo le formule, resta agli atti quella che il proponente ha letto.
      dichiarazioni_testo: {
        veridicita: DICHIARAZIONE_VERIDICITA_TESTO,
        accettazione: DICHIARAZIONE_ACCETTAZIONE_TESTO,
        pubblicita: DICHIARAZIONE_PUBBLICITA_TESTO,
        privacy: CONSENSO_PRIVACY_BANDO_TESTO,
        ...(input.categoria === "A" ? {} : { concorsuali: DICHIARAZIONE_CONCORSUALI_TESTO }),
      },
    };

    let codice: string;
    const aggiornata = Boolean(esistente);

    if (esistente) {
      codice = esistente.codice;
      const { error: erroreUpdate } = await client
        .from("bando_applications")
        // stato, punteggio e note dell'istruttoria non sono qui: una modifica
        // del proponente non azzera il lavoro della Commissione.
        .update(riga)
        .eq("id", esistente.id);
      if (erroreUpdate) {
        console.error("Bando update error:", erroreUpdate);
        return NextResponse.json(
          { error: "Non e stato possibile aggiornare la candidatura. Riprova." },
          { status: 500 },
        );
      }
    } else {
      codice = generateCodiceBando();
      const { error: erroreInsert } = await client
        .from("bando_applications")
        .insert({ ...riga, codice });
      if (erroreInsert) {
        // 23505: collisione sulla chiave di deduplicazione. Puo capitare solo
        // in caso di doppio invio simultaneo dello stesso progetto.
        if (erroreInsert.code === "23505") {
          return NextResponse.json(
            {
              error:
                "Esiste gia una candidatura per questo progetto con questa email. Accedi al Member Portal con l'email del referente per aggiornarla.",
            },
            { status: 409 },
          );
        }
        console.error("Bando insert error:", erroreInsert);
        return NextResponse.json(
          { error: "Non e stato possibile registrare la candidatura. Riprova." },
          { status: 500 },
        );
      }
    }

    // ── Bacino marketing unificato, come per le iscrizioni all'evento ──
    if (input.consenso_marketing) {
      await client.from("newsletter_subscribers").upsert(
        {
          email,
          full_name: fullName,
          source: "bando-showcase-innovazione",
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    }

    // ── Email di conferma ──
    if (process.env.RESEND_API_KEY) {
      try {
        const etichette = ALLEGATI.reduce<Record<string, string>>((acc, a) => {
          acc[a.campo] = a.titolo;
          return acc;
        }, {});
        const allegatiRicevuti = [
          input.file_descrizione && etichette.descrizione,
          input.file_pitch_deck && etichette.pitch_deck,
          input.file_documentazione && etichette.documentazione,
          input.file_prospetto && etichette.prospetto,
          (input.file_extra?.length ?? 0) > 0 &&
            `${etichette.extra} (${input.file_extra!.length})`,
        ].filter((v): v is string => Boolean(v));

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
          to: email,
          subject: bandoEmailSubject(aggiornata),
          html: bandoEmailHtml({
            nome: input.referente_nome.trim(),
            codice,
            categoria: input.categoria,
            progetto,
            allegati: allegatiRicevuti,
            aggiornata,
            setPasswordUrl,
          }),
        });
      } catch (mailErr) {
        // La candidatura e salvata: un problema email non deve farla fallire.
        console.error("Bando confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true, codice, aggiornata });
  } catch (err) {
    console.error("Bando submission error:", err);
    return NextResponse.json(
      { error: "Invio della candidatura non riuscito. Riprova." },
      { status: 500 },
    );
  }
}
