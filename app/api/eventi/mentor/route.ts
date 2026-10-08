/**
 * GET dell'elenco dei mentor per chi partecipa al percorso, licei e
 * università.
 *
 * La pagina pubblica dei mentor mostra il profilo e basta. Questa rotta
 * aggiunge l'unica cosa che la pagina pubblica non deve avere: il contatto
 * professionale che il mentor ha messo a disposizione degli studenti. Da qui
 * le tre regole che la reggono, tutte e tre dalle "Linee guida per mentor"
 * della Fondazione:
 *
 *   1. serve l'accesso, e serve essere partecipanti: staff, studenti dei
 *      licei confermati dal referente, partecipanti confermati del percorso
 *      universitario. Un account qualsiasi del sito non basta;
 *   2. escono solo i mentor approvati e che hanno acconsentito alla
 *      pubblicazione, cioe gli stessi della pagina pubblica: un mentor che
 *      non vuole comparire in elenco non compare nemmeno qui;
 *   3. il contatto esce solo per chi ha accettato le linee guida. Senza
 *      accettazione il mentor resta in elenco, senza recapito.
 *
 * La lettura si fa con la service role DOPO il controllo, perche
 * `contatto_studenti` non e concesso a nessuno dei ruoli del browser
 * (migrazione 20261214000000). Le colonne si scelgono a mano, e fra queste
 * non ci sono email, telefono e competenze, che restano allo staff.
 *
 * Il contatto lo usa lo studente di sua iniziativa, fuori dalla
 * piattaforma: questa rotta non registra chi lo ha letto e non avvisa il
 * mentor, ed e il punto. La Fondazione non trasmette ai mentor i dati degli
 * studenti.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMember } from "@/lib/auth/admin";
import { requireStudente } from "@/lib/eventi/licei-server";
import { requireCandidato } from "@/lib/eventi/universita-server";
import { colonneLineeGuidaMancanti } from "@/lib/eventi/universita-mentor";

const COLONNE_PUBBLICHE =
  "id, nome, cognome, ruolo, organizzazione, aree, bio, sito, linkedin, foto_url";

type RigaMentor = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  organizzazione: string;
  aree: string[] | null;
  bio: string | null;
  sito: string | null;
  linkedin: string | null;
  foto_url: string | null;
  contatto_studenti?: string | null;
  linee_guida_accettate_at?: string | null;
};

export type MentorPerPartecipanti = Omit<
  RigaMentor,
  "contatto_studenti" | "linee_guida_accettate_at"
> & {
  /** Null se il mentor non ne ha indicato uno o non ha accettato le linee guida. */
  contatto_studenti: string | null;
};

const NON_PARTECIPANTE =
  "L'elenco dei mentor con i contatti è riservato a chi partecipa al percorso.";

/**
 * Chi chiama puo leggere i contatti?
 *
 * Lo staff passa sempre. Poi i due percorsi, ciascuno con la propria
 * guardia e quindi con le proprie regole: per i licei anche la chiusura del
 * percorso, che spegne gli accessi a fine corso come promette l'informativa.
 * Si prova prima la guardia dei licei e poi quella dell'universita: una
 * persona puo stare in uno solo dei due, e l'ordine conta solo per quale
 * messaggio d'errore si restituisce.
 */
async function autorizza(): Promise<
  { ok: true; client: SupabaseClient } | { ok: false; error: string; status: number }
> {
  // `requireMember` fa due cose: dice se c'e una sessione e se e staff, e
  // consegna il client con service role da usare DOPO il controllo. Lo
  // staff non passa da nessuna delle due guardie dei percorsi, quindi il
  // client non si puo prendere da loro.
  const membro = await requireMember();
  if (membro.error !== null) {
    return {
      ok: false,
      error: membro.status === 401 ? "Non autenticato." : membro.error,
      status: membro.status,
    };
  }
  const client = membro.client;
  if (membro.chiamante.isAdmin) return { ok: true, client };

  const licei = await requireStudente();
  if (licei.error === null) return { ok: true, client };

  const universita = await requireCandidato();
  if (universita.error === null) return { ok: true, client };

  // Il messaggio piu utile e quello del percorso in cui la persona c'e: un
  // liceale non confermato, o a percorso chiuso, deve leggere la ragione
  // vera e non che "non risulta iscritto". I 403 di "nessuna riga" sono i
  // due che non dicono niente, e si scartano.
  const nessunaRiga = (msg: string) => /^Nessuna (iscrizione|candidatura)/.test(msg);
  if (licei.status === 403 && !nessunaRiga(licei.error)) {
    return { ok: false, error: licei.error, status: 403 };
  }
  if (universita.status === 403 && !nessunaRiga(universita.error)) {
    return { ok: false, error: universita.error, status: 403 };
  }
  if (licei.status === 500 || universita.status === 500) {
    return { ok: false, error: "Configurazione server mancante.", status: 500 };
  }
  return { ok: false, error: NON_PARTECIPANTE, status: 403 };
}

export async function GET() {
  try {
    const accesso = await autorizza();
    if (!accesso.ok) {
      return NextResponse.json({ error: accesso.error }, { status: accesso.status });
    }

    const client = accesso.client;

    const query = (colonne: string) =>
      client
        .from("universita_mentor")
        .select(colonne)
        .eq("stato", "approvata")
        .eq("consenso_pubblicazione", true)
        .order("cognome", { ascending: true });

    let { data, error } = await query(
      `${COLONNE_PUBBLICHE}, contatto_studenti, linee_guida_accettate_at`,
    );

    // Migrazione 20261214000000 non ancora applicata: l'elenco esce lo
    // stesso, senza contatti. E' il ripiego prudente, perche senza la
    // colonna dell'accettazione non si puo sapere chi ha accettato.
    let contattiDisponibili = true;
    if (error && colonneLineeGuidaMancanti(error)) {
      contattiDisponibili = false;
      ({ data, error } = await query(COLONNE_PUBBLICHE));
    }

    if (error) {
      console.error("Mentor partecipanti: lettura fallita:", error);
      return NextResponse.json(
        { error: "Non è stato possibile leggere l'elenco dei mentor." },
        { status: 500 },
      );
    }

    const mentor: MentorPerPartecipanti[] = ((data ?? []) as unknown as RigaMentor[]).map(
      (m) => ({
        id: m.id,
        nome: m.nome,
        cognome: m.cognome,
        ruolo: m.ruolo,
        organizzazione: m.organizzazione,
        aree: m.aree,
        bio: m.bio,
        sito: m.sito,
        linkedin: m.linkedin,
        foto_url: m.foto_url,
        contatto_studenti:
          contattiDisponibili && m.linee_guida_accettate_at && m.contatto_studenti
            ? m.contatto_studenti
            : null,
      }),
    );

    return NextResponse.json(
      { mentor },
      // Un elenco con recapiti, letto dopo un controllo d'identita: niente
      // cache condivise fra un utente e l'altro.
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("Mentor partecipanti: errore:", err);
    return NextResponse.json({ error: "Si è verificato un errore. Riprova." }, { status: 500 });
  }
}
