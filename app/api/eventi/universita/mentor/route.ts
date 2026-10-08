/**
 * POST della candidatura a mentor del percorso universitario.
 *
 * Rotta pubblica e senza autenticazione, come la gemella delle
 * pre-iscrizioni. Chi si propone come mentor arriva da fuori, spesso da un
 * laboratorio o da un'azienda che con questo sito non ha mai avuto niente a
 * che fare: chiedergli di registrarsi prima di sapere se la Fondazione lo
 * vuole sarebbe un modulo messo davanti al modulo.
 *
 * Una candidatura per indirizzo. Un secondo invio con la stessa email viene
 * rifiutato con un 409 e non fuso nel primo, per la stessa ragione della
 * rotta delle pre-iscrizioni: senza autenticazione un aggiornamento
 * silenzioso permetterebbe a chiunque conosca un indirizzo di riscrivere il
 * profilo di quella persona, che qui per giunta e un profilo destinato a una
 * pagina pubblica.
 *
 * Non c'e il cancello della finestra di candidatura, e non e una
 * dimenticanza. La finestra dell'art. 4 riguarda gli studenti che si
 * candidano al percorso; l'art. 5 mette il mentoring lungo tutto il percorso,
 * quindi un ricercatore che scopre l'iniziativa a fase avanzata e ancora
 * utile. Rispondergli "le candidature sono chiuse" chiuderebbe una porta che
 * non ha ragione di chiudersi.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { universitaAdminClient } from "@/lib/eventi/universita-server";
import {
  colonneLineeGuidaMancanti,
  normalizzaAree,
  validateMentor,
  type MentorInput,
} from "@/lib/eventi/universita-mentor";
import { LINEE_GUIDA_MENTOR_TESTO } from "@/app/eventi/vivere-piu-a-lungo/linee-guida-mentor/content";
import { messaggioErroreDb } from "@/lib/eventi/universita-squadre";
import {
  universitaMentorEmailHtml,
  universitaMentorEmailSubject,
} from "@/lib/eventi/universita-email";
import {
  CONSENSO_PRIVACY_MENTOR_TESTO,
  CONSENSO_PUBBLICAZIONE_MENTOR_TESTO,
  CONTATTI_UNIVERSITA,
} from "@/app/eventi/vivere-piu-a-lungo/universita/content";

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Un campo facoltativo lasciato vuoto e `null` in tabella, non stringa vuota. */
const opzionale = (v: string): string | null => (v === "" ? null : v);

/**
 * Lo stesso messaggio per il duplicato trovato in lettura e per quello che
 * scatta in scrittura: distinguerli direbbe a chi prova indirizzi altrui se
 * la collisione e arrivata prima o dopo, che e un'informazione che non
 * serve a nessuno di legittimo.
 */
const DUPLICATO = `Con questa email risulta già una candidatura come mentor. Se deve correggere qualcosa, scriva a ${CONTATTI_UNIVERSITA.fondazione.email}.`;

export async function POST(request: Request) {
  try {
    const client = universitaAdminClient();
    if (!client) {
      console.error("Universita mentor: service role non configurata");
      return NextResponse.json(
        { error: "Il servizio non è disponibile al momento. Riprova più tardi." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Partial<MentorInput> & { website?: string };

    // Honeypot compilato: successo silenzioso, nessuna scrittura e nessuna
    // email. La risposta e identica a quella di un invio buono, altrimenti
    // basterebbe confrontare le due per capire che il campo va lasciato vuoto.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    const input: MentorInput = {
      nome: str(body.nome),
      cognome: str(body.cognome),
      email: str(body.email).toLowerCase(),
      telefono: str(body.telefono),
      ruolo: str(body.ruolo),
      organizzazione: str(body.organizzazione),
      // Le aree si validano grezze e si normalizzano dopo: se ne arriva una
      // che non esiste, chi ha compilato si sente dire che quell'area non e
      // valida invece di vedersela sparire e leggere che non ne ha indicata
      // nessuna.
      aree: Array.isArray(body.aree) ? body.aree.map(String) : [],
      bio: str(body.bio),
      competenze: str(body.competenze),
      disponibilita: str(body.disponibilita),
      sito: str(body.sito),
      linkedin: str(body.linkedin),
      consenso_pubblicazione: body.consenso_pubblicazione === true,
      consenso_privacy: body.consenso_privacy === true,
      contatto_studenti: str(body.contatto_studenti),
      linee_guida_accettate: body.linee_guida_accettate === true,
    };

    const errore = validateMentor(input);
    if (errore) return NextResponse.json({ error: errore }, { status: 400 });

    const aree = normalizzaAree(input.aree);

    // Confronto esatto, non `ilike`: `%` e `_` sono caratteri validi nella
    // parte locale di un indirizzo, e con `ilike` arriverebbero a Postgres
    // come jolly, quindi una richiesta potrebbe agganciare la riga di
    // un'altra persona e farsi rispondere che quella riga esiste. L'email e
    // gia normalizzata a minuscolo qui sopra e la tabella ha l'indice unico
    // su lower(email).
    const { data: esistente } = await client
      .from("universita_mentor")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (esistente) {
      return NextResponse.json({ error: DUPLICATO }, { status: 409 });
    }

    // Qui NON si crea nessun account, a differenza della rotta delle
    // pre-iscrizioni. Una candidatura non e un'approvazione: un account
    // consegnato prima che la direzione scientifica abbia letto il profilo
    // sarebbe una porta aperta per niente, visto che dietro non c'e ancora
    // niente da vedere. Lo crea lo staff al momento dell'approvazione,
    // insieme all'email di esito, e `user_id` resta nullo fino ad allora.
    const riga: Record<string, unknown> = {
      nome: input.nome,
      cognome: input.cognome,
      email: input.email,
      telefono: opzionale(input.telefono),
      ruolo: input.ruolo,
      organizzazione: input.organizzazione,
      aree,
      bio: input.bio,
      competenze: input.competenze,
      disponibilita: opzionale(input.disponibilita),
      sito: opzionale(input.sito),
      linkedin: opzionale(input.linkedin),
      // Una proposta arrivata da fuori. L'altra origine, `staff`, e per i
      // mentor che inserisce la Fondazione, che non passano da questa rotta.
      stato: "proposta",
      origine: "candidatura",
      consenso_pubblicazione: input.consenso_pubblicazione,
      consenso_privacy: input.consenso_privacy,
      // I due testi si registrano sempre, anche quello della pubblicazione
      // quando il consenso non e stato dato: la colonna di testo dice quale
      // formula e stata mostrata, il booleano se e stata accettata, e sono
      // due informazioni diverse. Tenere solo la prima meta lascerebbe fra
      // un anno una riga con un "no" e nessun modo di sapere a che cosa.
      consenso_pubblicazione_testo: CONSENSO_PUBBLICAZIONE_MENTOR_TESTO,
      consenso_privacy_testo: CONSENSO_PRIVACY_MENTOR_TESTO,
    };

    // Le linee guida si registrano come i consensi: la data e il testo
    // accettato, per intero. La casella e obbligatoria e `validateMentor`
    // lo ha gia controllato, quindi qui l'accettazione c'e sempre.
    const lineeGuida = {
      contatto_studenti: opzionale(input.contatto_studenti),
      linee_guida_accettate_at: new Date().toISOString(),
      linee_guida_testo: LINEE_GUIDA_MENTOR_TESTO,
    };

    let { error: erroreInsert } = await client
      .from("universita_mentor")
      .insert({ ...riga, ...lineeGuida });

    // Il codice puo arrivare in produzione prima della migrazione
    // 20261214000000, che si applica a mano. In quel caso la candidatura si
    // salva lo stesso senza i tre campi nuovi: perdere una candidatura per
    // una colonna che manca sarebbe peggio che doverle chiedere di nuovo il
    // contatto. Lo staff vede nel pannello che l'accettazione manca e la
    // registra quando la colonna c'e.
    if (erroreInsert && colonneLineeGuidaMancanti(erroreInsert)) {
      console.warn(
        "Universita mentor: colonne delle linee guida assenti, candidatura salvata senza (migrazione 20261214000000 da applicare).",
      );
      ({ error: erroreInsert } = await client.from("universita_mentor").insert(riga));
    }

    if (erroreInsert) {
      // 23505: due invii simultanei dello stesso indirizzo, che il controllo
      // in lettura qui sopra non puo intercettare perche fra la select e la
      // insert non c'e nessun lucchetto. Stessa risposta del duplicato
      // trovato prima.
      if (erroreInsert.code === "23505") {
        return NextResponse.json({ error: DUPLICATO }, { status: 409 });
      }
      // Il resto passa dal traduttore comune del modulo prima di diventare un
      // 500. Oggi nessun vincolo di questa tabella ci finisce dentro, ma
      // questa rotta non deve essere il punto in cui un vincolo aggiunto
      // domani esce in postgrese verso chi sta compilando un modulo.
      const tradotto = messaggioErroreDb(erroreInsert.message);
      if (tradotto) return NextResponse.json({ error: tradotto }, { status: 400 });

      console.error("Universita mentor insert error:", erroreInsert);
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
          subject: universitaMentorEmailSubject(),
          html: universitaMentorEmailHtml({ nome: input.nome }),
        });
      } catch (mailErr) {
        // La candidatura e salvata: un problema di posta non deve farla
        // fallire e spingere chi ha compilato a rimandare tutto da capo,
        // dove troverebbe il 409 del proprio invio riuscito.
        console.error("Universita mentor confirmation email failed:", mailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Universita mentor submission error:", err);
    return NextResponse.json(
      { error: "Si è verificato un errore. Riprova." },
      { status: 500 },
    );
  }
}
