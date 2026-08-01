import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/admin";
import { generateCodice } from "@/lib/eventi/registration";
import { finalistaEmailHtml, finalistaEmailSubject } from "@/lib/eventi/licei-email";
import { SESSIONE_FINALISTI } from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Iscrizione d'ufficio dei finalisti all'evento del 10 dicembre (art. 6).
 *
 * I finalisti non si iscrivono, ci vengono iscritti. Sono gia nel database
 * con nome, cognome ed email, il loro istituto si e impegnato nell'art. 4 a
 * favorire la partecipazione all'evento finale, l'autorizzazione dei
 * genitori e in segreteria e il loro progetto e in programma sul palco.
 * Rimandarli a un modulo pubblico significherebbe mettere un ostacolo fra
 * loro e una sedia che e gia la loro, e rischiare che qualcuno non lo
 * compili e resti fuori dalla presentazione del proprio lavoro.
 *
 * L'operazione e ripetibile: chi risulta gia iscritto viene lasciato dov'e.
 */
export async function POST() {
  const guard = await requireAdmin();
  if (guard.error !== null) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { client } = guard;

  const { data: progetti, error } = await client
    .from("licei_progetti")
    .select(
      "id, titolo, posizione, squadra_id, iscritti_evento_at, licei_squadre(nome), licei_adesioni(istituto_denominazione)",
    )
    .eq("finalista", true)
    .order("posizione", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!progetti || progetti.length === 0) {
    return NextResponse.json(
      { error: "Nessun progetto è designato finalista. Designali prima dalla classifica." },
      { status: 409 },
    );
  }

  // La sessione dove i ragazzi presentano. Se manca a database non si tira a
  // indovinare: senza sessione l'iscrizione non varrebbe un posto.
  const { data: sessione } = await client
    .from("event_sessions")
    .select("id, slug")
    .eq("slug", SESSIONE_FINALISTI)
    .maybeSingle();

  if (!sessione) {
    return NextResponse.json(
      {
        error: `La sessione "${SESSIONE_FINALISTI}" non esiste fra quelle dell'evento. Controlla le migrazioni dell'evento prima di procedere.`,
      },
      { status: 500 },
    );
  }

  const esito = {
    iscritti: 0,
    gia_iscritti: 0,
    squadre: 0,
    saltati: [] as string[],
  };

  const daAvvisare: {
    nome: string;
    email: string;
    codice: string;
    squadra: string;
    titolo: string;
    posizione: number | null;
  }[] = [];

  for (const p of progetti) {
    const squadra = p.licei_squadre as unknown as { nome?: string } | null;
    const ades = p.licei_adesioni as unknown as { istituto_denominazione?: string } | null;

    // Solo i confermati dal referente. Chi e rimasto in attesa non e in
    // elenco per la scuola, e non puo diventarlo passando da qui.
    const { data: membri } = await client
      .from("licei_iscrizioni")
      .select("id, nome, cognome, email, classe, stato")
      .eq("squadra_id", p.squadra_id)
      .eq("stato", "confermata");

    if (!membri || membri.length === 0) {
      esito.saltati.push(`${squadra?.nome ?? p.titolo}: nessun componente confermato`);
      continue;
    }

    esito.squadre += 1;

    for (const m of membri as {
      nome: string;
      cognome: string;
      email: string;
      classe: string;
    }[]) {
      const { data: gia } = await client
        .from("event_registrations")
        .select("id")
        .ilike("email", m.email)
        .maybeSingle();

      const { data: rpcData, error: rpcError } = await client.rpc("event_register", {
        p_user_id: null,
        p_nome: m.nome,
        p_cognome: m.cognome,
        p_email: m.email,
        p_telefono: null,
        p_categoria: "studente",
        p_organizzazione: ades?.istituto_denominazione ?? null,
        p_classe: m.classe,
        p_startup_name: null,
        p_startup_url: null,
        p_startup_desc: null,
        p_referente: null,
        p_note: `Finalista percorso licei . squadra ${squadra?.nome ?? ""}`.trim(),
        // Nessun consenso marketing: non e stato chiesto, e un'iscrizione
        // d'ufficio non e l'occasione per darselo da soli.
        p_marketing: false,
        p_marketing_testo: null,
        p_codice: generateCodice(),
        p_session_slugs: [SESSIONE_FINALISTI],
      });

      if (rpcError) {
        console.error("Licei finalista event_register error:", rpcError);
        esito.saltati.push(`${m.cognome} ${m.nome}: iscrizione non riuscita`);
        continue;
      }

      const risultato = rpcData as { registration_id: string; codice: string };

      // Chi presenta dal palco non puo stare in lista d'attesa. La capienza
      // vale per il pubblico, non per chi e in programma: il posto glielo
      // stiamo assegnando noi, non lo stanno chiedendo loro.
      await client
        .from("event_registration_sessions")
        .update({ is_waitlist: false })
        .eq("registration_id", risultato.registration_id)
        .eq("session_id", sessione.id);

      if (gia) {
        esito.gia_iscritti += 1;
      } else {
        esito.iscritti += 1;
        daAvvisare.push({
          nome: m.nome,
          email: m.email,
          codice: risultato.codice,
          squadra: squadra?.nome ?? "",
          titolo: p.titolo,
          posizione: p.posizione,
        });
      }
    }

    await client
      .from("licei_progetti")
      .update({ iscritti_evento_at: new Date().toISOString() })
      .eq("id", p.id);
  }

  /* ── Avviso ai nuovi iscritti ── */
  // Solo a chi e stato iscritto adesso: chi c'era gia ha ricevuto la sua
  // email a suo tempo e non deve riceverne una seconda a ogni ripetizione.
  if (process.env.RESEND_API_KEY && daAvvisare.length > 0) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await Promise.all(
        daAvvisare.map((d) =>
          resend.emails.send({
            from: "Fondazione bioERGOtech <noreply@bioergotech.org>",
            to: d.email,
            subject: finalistaEmailSubject(),
            html: finalistaEmailHtml(d),
          }),
        ),
      );
    } catch (mailErr) {
      console.error("Licei finalista email failed:", mailErr);
    }
  }

  return NextResponse.json({ success: true, ...esito });
}
