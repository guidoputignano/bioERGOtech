import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGGIO_SOLO_REFERENTE, erroreSchemaMancante, requireDocente } from "@/lib/eventi/licei-server";
import {
  COLONNE_DOCENTE,
  LINK_ACCESSO_DOCENTE,
  docentiIstituto,
  escapeLike,
  leggiClassi,
  preparaAccessoDocente,
  rimandaDal,
  rispostaDocenti,
  type RigaDocente,
} from "@/lib/eventi/licei-docenti";
import {
  docenteAggiuntoIstitutoEmailHtml,
  docenteAggiuntoIstitutoEmailSubject,
  docenteInvitoEmailHtml,
  docenteInvitoEmailSubject,
} from "@/lib/eventi/licei-email";
import {
  CONTATTI_LICEI,
  DICHIARAZIONE_INVITO_DOCENTE_TESTO,
  DOCENTI_PROGETTO_MAX,
  RIMANDA_INVITO_MINUTI,
  STATI_ADESIONE_CHE_ACCETTANO,
} from "@/app/eventi/vivere-piu-a-lungo/licei/content";

/**
 * Docenti del progetto: gli altri docenti dell'istituto che il referente
 * principale indica, fino a `DOCENTI_PROGETTO_MAX`.
 *
 * Chi puo fare che cosa:
 * - GET: il referente vede l'elenco completo; un docente del progetto solo
 *   i nomi dei colleghi.
 * - POST (invito), e le azioni `revoca` e `rimanda_invito` della PATCH: solo
 *   il referente principale.
 * - PATCH `classi`: il referente, o il docente sulla propria riga.
 *
 * Ogni query filtra per l'istituto del chiamante, anche quando cerca per id:
 * il client ha la service role e RLS non lo ferma. Un id di un'altra scuola
 * risponde 404, come uno che non esiste.
 *
 * Prima della migrazione 20261215000000 la tabella non c'e: la GET risponde
 * `{ disponibile: false }` e la console mostra "Funzione in attivazione".
 */

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const testo = (v: unknown): string => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const NOME_MAX = 80;

const MESSAGGIO_NON_DISPONIBILE =
  "La funzione è in attivazione: fra qualche giorno potrai indicare qui gli altri docenti dell'istituto.";

/**
 * Un rifiuto solo, per tutti i casi in cui l'email non si puo invitare per
 * ragioni che riguardano altri: uno studente iscritto al percorso, un
 * account gia legato a un altro istituto. Dirlo per esteso rivelerebbe chi
 * e iscritto dove, o che l'account esiste.
 */
const MESSAGGIO_EMAIL_NON_INVITABILE =
  "Non è possibile indicare questa email come docente del progetto. Se pensi che sia un errore, scrivi a info@bioergotech.org.";

const MESSAGGIO_NON_TROVATO = "Docente non trovato fra quelli del tuo istituto.";

const nonDisponibile = () =>
  NextResponse.json({ disponibile: false, error: MESSAGGIO_NON_DISPONIBILE }, { status: 503 });

/** Il mittente di tutte le email del percorso. */
const MITTENTE = "Fondazione bioERGOtech <noreply@bioergotech.org>";

/** L'ora da cui si puo rimandare, come la legge un docente in Italia. */
const oraRoma = (iso: string) =>
  new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/**
 * I controlli che riguardano altre persone, per l'invito e per il reinvio.
 * Uno studente, di qualunque scuola, non diventa docente: un'email che
 * compare fra le iscrizioni di QUALSIASI istituto, o un account legato a
 * un'iscrizione, non riceve un accesso da docente. E un'email o un account
 * gia legati a un altro istituto non si collegano a questo: la guardia gli
 * risponderebbe 409, e un invito basterebbe a togliere l'accesso al docente
 * di un'altra scuola. Lo sistema lo staff, su richiesta.
 *
 * `account` sono gli account da controllare oltre all'email: quello trovato
 * per email, e nel reinvio quello gia legato alla riga. Torna null se una
 * lettura e fallita: allora non si invita.
 */
async function legatoAltrove(
  client: SupabaseClient,
  adesioneId: string,
  email: string,
  account: (string | null | undefined)[],
): Promise<boolean | null> {
  const like = escapeLike(email);
  const perEmail = await Promise.all([
    client.from("licei_iscrizioni").select("id").ilike("email", like).limit(1),
    client.from("licei_adesioni").select("id").ilike("referente_email", like).neq("id", adesioneId).limit(1),
    client
      .from("licei_docenti")
      .select("id")
      .ilike("email", like)
      .neq("adesione_id", adesioneId)
      .in("stato", ["invitato", "attivo"])
      .limit(1),
  ]);
  const errore = perEmail.find((r) => r.error)?.error;
  if (errore) {
    console.error("Licei docenti: controlli falliti:", errore.message);
    return null;
  }
  if (perEmail.some((r) => (r.data ?? []).length > 0)) return true;

  for (const id of [...new Set(account.filter((a): a is string => !!a))]) {
    const perAccount = await Promise.all([
      client.from("licei_iscrizioni").select("id").eq("user_id", id).limit(1),
      client.from("licei_adesioni").select("id").eq("user_id", id).neq("id", adesioneId).limit(1),
      client
        .from("licei_docenti")
        .select("id")
        .eq("user_id", id)
        .neq("adesione_id", adesioneId)
        .in("stato", ["invitato", "attivo"])
        .limit(1),
    ]);
    const erroreAccount = perAccount.find((r) => r.error)?.error;
    if (erroreAccount) {
      console.error("Licei docenti: controlli sull'account falliti:", erroreAccount.message);
      return null;
    }
    if (perAccount.some((r) => (r.data ?? []).length > 0)) return true;
  }
  return false;
}

/** L'elenco, nella forma adatta a chi guarda. */
export async function GET() {
  const guard = await requireDocente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  try {
    const risposta = await rispostaDocenti(client, ctx);
    return NextResponse.json(risposta, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Licei docenti GET error:", err);
    return NextResponse.json({ error: "Caricamento non riuscito. Riprova fra poco." }, { status: 500 });
  }
}

/**
 * Il referente indica un collega.
 *
 * I controlli vengono tutti prima di creare un account, e nell'ordine in cui
 * un referente li capisce: lo stato dell'adesione, se stesso, i doppioni, il
 * tetto, e per ultimi quelli che riguardano altre persone. L'ultimo e il
 * piu importante: uno studente non deve mai ricevere la vista sui compagni,
 * quindi un'email che compare fra le iscrizioni di QUALSIASI istituto, o un
 * account legato a un'iscrizione, non si invita.
 *
 * La risposta e la stessa che l'account esistesse o no: l'email che parte
 * al docente e diversa (link per la password o link di accesso), ma la
 * legge solo lui.
 */
export async function POST(request: Request) {
  const guard = await requireDocente({ principale: true });
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json().catch(() => ({}))) as {
    nome?: unknown;
    cognome?: unknown;
    email?: unknown;
    classi?: unknown;
    dichiarazione?: unknown;
  };

  const nome = testo(body.nome);
  const cognome = testo(body.cognome);
  const email = testo(body.email).toLowerCase();
  const classi = leggiClassi(body.classi);

  if (!nome || nome.length > NOME_MAX) {
    return NextResponse.json({ error: "Indica il nome del docente." }, { status: 400 });
  }
  if (!cognome || cognome.length > NOME_MAX) {
    return NextResponse.json({ error: "Indica il cognome del docente." }, { status: 400 });
  }
  if (!isEmail(email)) return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  if (classi === null) {
    return NextResponse.json(
      { error: "Classi non valide: scrivile separate da una virgola, per esempio 4A, 5B." },
      { status: 400 },
    );
  }
  if (body.dichiarazione !== true) {
    return NextResponse.json(
      { error: "Per indicare un docente spunta la dichiarazione." },
      { status: 400 },
    );
  }

  if (!STATI_ADESIONE_CHE_ACCETTANO.has(ctx.adesione.stato)) {
    return NextResponse.json(
      {
        error:
          "Potrai indicare altri docenti quando l'adesione del vostro istituto sarà confermata.",
      },
      { status: 409 },
    );
  }

  // I dati dell'adesione che la guardia non porta con se: l'email del
  // referente, per riconoscere l'auto-invito, e quella istituzionale, a cui
  // va l'avviso.
  const { data: adesione, error: erroreAdesione } = await client
    .from("licei_adesioni")
    .select("id, user_id, referente_email, istituto_email")
    .eq("id", ctx.adesione.id)
    .maybeSingle();
  if (erroreAdesione || !adesione) {
    console.error("Licei docenti: lettura adesione fallita:", erroreAdesione?.message);
    return NextResponse.json({ error: "Invito non riuscito. Riprova fra poco." }, { status: 500 });
  }

  if (email === String(adesione.referente_email ?? "").trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Questa è l'email del docente referente, che ha già il suo accesso." },
      { status: 409 },
    );
  }

  let righe: RigaDocente[] | null;
  try {
    righe = await docentiIstituto(client, ctx.adesione.id);
  } catch (err) {
    console.error("Licei docenti POST error:", err);
    return NextResponse.json({ error: "Invito non riuscito. Riprova fra poco." }, { status: 500 });
  }
  if (righe === null) return nonDisponibile();

  const stessa = righe.find((r) => r.email.trim().toLowerCase() === email);
  if (stessa && stessa.stato !== "revocato") {
    return NextResponse.json(
      {
        error:
          stessa.stato === "attivo"
            ? "Questo docente è già fra i docenti del progetto."
            : "Questo docente è già stato invitato. Se non ha ricevuto l'email, usa «Rimanda invito».",
      },
      { status: 409 },
    );
  }

  // Revocare e indicare di nuovo la stessa persona non scavalca il limite
  // dei reinvii: ogni giro manderebbe un'email al docente e una alla scuola.
  const dalReinvito = stessa ? rimandaDal(stessa.invito_inviato_at) : null;
  if (dalReinvito) {
    return NextResponse.json(
      {
        error: `L'invito a questo docente è appena partito. Si può indicare di nuovo dopo ${RIMANDA_INVITO_MINUTI} minuti, dalle ${oraRoma(dalReinvito)}.`,
        rimanda_dal: dalReinvito,
      },
      { status: 429 },
    );
  }

  const nonRevocati = righe.filter((r) => r.stato !== "revocato").length;
  if (nonRevocati >= DOCENTI_PROGETTO_MAX) {
    return NextResponse.json(
      {
        error: `Avete già ${DOCENTI_PROGETTO_MAX} docenti del progetto. Per indicarne un altro, revoca prima l'accesso di uno di loro.`,
      },
      { status: 409 },
    );
  }

  // ── Controlli che riguardano altre persone ──
  // Per ultimi, e prima di creare qualsiasi account (`legatoAltrove`).
  const { data: profilo, error: erroreProfilo } = await client
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (erroreProfilo) {
    console.error("Licei docenti: lettura profilo fallita:", erroreProfilo.message);
    return NextResponse.json({ error: "Invito non riuscito. Riprova fra poco." }, { status: 500 });
  }
  const profiloId = (profilo?.id as string | undefined) ?? null;

  if (profiloId && (profiloId === ctx.userId || profiloId === adesione.user_id)) {
    return NextResponse.json(
      { error: "Questa è l'email del docente referente, che ha già il suo accesso." },
      { status: 409 },
    );
  }

  const bloccata = await legatoAltrove(client, ctx.adesione.id, email, [profiloId, stessa?.user_id]);
  if (bloccata === null) {
    return NextResponse.json({ error: "Invito non riuscito. Riprova fra poco." }, { status: 500 });
  }
  if (bloccata) {
    return NextResponse.json({ error: MESSAGGIO_EMAIL_NON_INVITABILE }, { status: 409 });
  }

  // ── Account ──
  // Per un docente revocato e indicato di nuovo vale l'account gia legato
  // alla sua riga; per gli altri quello trovato per email, se c'e.
  const accesso = await preparaAccessoDocente(client, {
    email,
    nome,
    cognome,
    userId: stessa?.user_id ?? profiloId,
  });
  if (!accesso.ok) return NextResponse.json({ error: accesso.errore }, { status: 500 });

  // ── La riga ──
  // Una riga revocata torna 'invitato': stessa persona, stesso istituto, e
  // le istruzioni si accettano di nuovo. La dichiarazione si congela con il
  // testo esatto, come le altre del percorso.
  const adesso = new Date().toISOString();
  const campi = {
    user_id: accesso.userId,
    nome,
    cognome,
    email,
    classi,
    stato: "invitato",
    invitato_da: ctx.userId,
    invitato_at: adesso,
    dichiarazione_invito: {
      testo: DICHIARAZIONE_INVITO_DOCENTE_TESTO,
      referente: `${ctx.adesione.referente_nome} ${ctx.adesione.referente_cognome}`.trim(),
      ts: adesso,
    },
    revocato_at: null,
    revocato_da: null,
    // `invito_inviato_at` non c'e: su una riga revocata resta quello di
    // prima, che e il limite dei reinvii.
  };

  const scrittura = stessa
    ? client
        .from("licei_docenti")
        .update(campi)
        .eq("id", stessa.id)
        .eq("adesione_id", ctx.adesione.id)
        .eq("stato", "revocato")
        .select(COLONNE_DOCENTE)
        .maybeSingle()
    : client
        .from("licei_docenti")
        .insert({ ...campi, adesione_id: ctx.adesione.id, invito_inviato_at: null })
        .select(COLONNE_DOCENTE)
        .maybeSingle();
  const { data: riga, error: erroreRiga } = await scrittura;

  if (erroreRiga || !riga) {
    // L'account appena creato per un invito che non c'e piu non deve
    // restare: nessuna riga lo legherebbe al percorso, e la chiusura non lo
    // troverebbe.
    if (accesso.nuovo) await client.auth.admin.deleteUser(accesso.userId).catch(() => null);
    if (erroreSchemaMancante(erroreRiga, "tabella")) return nonDisponibile();
    // Un doppione arrivato nel frattempo (due clic, due schede), o una riga
    // revocata che nel frattempo non lo e piu.
    if (!erroreRiga || erroreRiga.code === "23505") {
      return NextResponse.json(
        { error: "Questo docente è già fra i docenti del progetto." },
        { status: 409 },
      );
    }
    console.error("Licei docenti insert error:", erroreRiga);
    return NextResponse.json({ error: "Invito non riuscito. Riprova fra poco." }, { status: 500 });
  }

  // ── Email ──
  const emailInviata = await inviaInvito(client, riga as unknown as RigaDocente, {
    istituto: ctx.adesione.istituto_denominazione,
    referente: `${ctx.adesione.referente_nome} ${ctx.adesione.referente_cognome}`.trim(),
    setPasswordUrl: accesso.setPasswordUrl,
  });

  // L'avviso all'istituto parte sempre, anche se quello al docente non e
  // partito: e il controllo sull'invito, non una cortesia. Se l'istituto non
  // ha un indirizzo valido, arriva almeno alla Fondazione.
  // `avviso_istituto` dice al referente se e partito davvero verso
  // l'indirizzo della scuola: l'informativa lo promette, e la console non
  // deve confermarlo quando non e successo. Quando non e partito, il log lo dice
  // con una riga riconoscibile, per inoltrarlo a mano.
  const istituzionale = String(adesione.istituto_email ?? "").trim().toLowerCase();
  let avvisoIstituto = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: MITTENTE,
        to: isEmail(istituzionale) ? istituzionale : CONTATTI_LICEI.fondazione.email,
        ...(isEmail(istituzionale) ? { bcc: CONTATTI_LICEI.fondazione.email } : {}),
        replyTo: CONTATTI_LICEI.fondazione.email,
        subject: docenteAggiuntoIstitutoEmailSubject(ctx.adesione.istituto_denominazione),
        html: docenteAggiuntoIstitutoEmailHtml({
          istituto: ctx.adesione.istituto_denominazione,
          referente: `${ctx.adesione.referente_nome} ${ctx.adesione.referente_cognome}`.trim(),
          docente: `${nome} ${cognome}`,
          docenteEmail: email,
          classi,
          quando: adesso,
        }),
      });
      if (error) console.error("Licei docenti: avviso all'istituto non partito:", error);
      else avvisoIstituto = isEmail(istituzionale);
    } catch (mailErr) {
      console.error("Licei docenti: avviso all'istituto non partito:", mailErr);
    }
  }
  if (!avvisoIstituto) {
    console.error("Licei docenti: AVVISO ISTITUTO DA INOLTRARE", {
      adesione_id: ctx.adesione.id,
      docente_id: (riga as unknown as RigaDocente).id,
    });
  }

  return NextResponse.json({ success: true, email_inviata: emailInviata, avviso_istituto: avvisoIstituto });
}

/**
 * Manda al docente l'email con il link di accesso e, solo se e partita,
 * registra l'ora dell'invio: e quella che limita i reinvii. Un invio fallito
 * lascia il reinvio libero subito, che e quello che serve al referente.
 */
async function inviaInvito(
  client: SupabaseClient,
  riga: RigaDocente,
  extra: { istituto: string; referente: string; setPasswordUrl?: string },
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: MITTENTE,
      to: riga.email,
      replyTo: CONTATTI_LICEI.fondazione.email,
      subject: docenteInvitoEmailSubject(),
      html: docenteInvitoEmailHtml({
        nome: riga.nome,
        cognome: riga.cognome,
        referente: extra.referente,
        istituto: extra.istituto,
        classi: riga.classi ?? [],
        loginUrl: LINK_ACCESSO_DOCENTE,
        setPasswordUrl: extra.setPasswordUrl,
      }),
    });
    if (error) {
      console.error("Licei docenti: invito non partito:", error);
      return false;
    }
  } catch (mailErr) {
    console.error("Licei docenti: invito non partito:", mailErr);
    return false;
  }

  const { error } = await client
    .from("licei_docenti")
    .update({ invito_inviato_at: new Date().toISOString() })
    .eq("id", riga.id)
    .eq("adesione_id", riga.adesione_id);
  if (error) console.error("Licei docenti: ora dell'invito non registrata:", error.message);
  return true;
}

/**
 * Tre azioni su una riga: `classi`, `revoca`, `rimanda_invito`.
 *
 * La revoca ha effetto alla richiesta successiva del docente: la guardia
 * legge lo stato dal database ogni volta. La riga resta, come registro di
 * chi ha avuto accesso e fino a quando.
 */
export async function PATCH(request: Request) {
  const guard = await requireDocente();
  if (guard.error !== null) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { client, ctx } = guard;

  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    azione?: unknown;
    classi?: unknown;
  };

  const id = typeof body.id === "string" ? body.id : "";
  const azione = body.azione;
  if (!id) return NextResponse.json({ error: "Docente non indicato." }, { status: 400 });
  if (azione !== "classi" && azione !== "revoca" && azione !== "rimanda_invito") {
    return NextResponse.json({ error: "Azione non riconosciuta." }, { status: 400 });
  }

  const principale = ctx.ruolo === "referente";
  // Le classi le cambia il referente, o il docente sulle proprie. Il resto
  // e solo del referente.
  if (!principale && !(azione === "classi" && id === ctx.docenteId)) {
    return NextResponse.json({ error: MESSAGGIO_SOLO_REFERENTE }, { status: 403 });
  }

  // Il filtro su adesione_id e la vera guardia: senza, l'id di un docente di
  // un'altra scuola basterebbe a revocarlo o a fargli arrivare un link.
  const { data, error } = await client
    .from("licei_docenti")
    .select(COLONNE_DOCENTE)
    .eq("id", id)
    .eq("adesione_id", ctx.adesione.id)
    .maybeSingle();
  if (erroreSchemaMancante(error, "tabella")) return nonDisponibile();
  if (error) {
    // Un id che non e un uuid e un id che non esiste.
    if (error.code === "22P02") return NextResponse.json({ error: MESSAGGIO_NON_TROVATO }, { status: 404 });
    console.error("Licei docenti PATCH read error:", error.message);
    return NextResponse.json({ error: "Operazione non riuscita. Riprova fra poco." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: MESSAGGIO_NON_TROVATO }, { status: 404 });
  const riga = data as unknown as RigaDocente;

  if (azione === "classi") {
    const classi = leggiClassi(body.classi);
    if (classi === null) {
      return NextResponse.json(
        { error: "Classi non valide: scrivile separate da una virgola, per esempio 4A, 5B." },
        { status: 400 },
      );
    }
    if (riga.stato === "revocato") {
      return NextResponse.json({ error: "L'accesso di questo docente è revocato." }, { status: 409 });
    }
    const { error: erroreUpdate } = await client
      .from("licei_docenti")
      .update({ classi })
      .eq("id", riga.id)
      .eq("adesione_id", ctx.adesione.id)
      .neq("stato", "revocato");
    if (erroreUpdate) {
      console.error("Licei docenti classi error:", erroreUpdate.message);
      return NextResponse.json({ error: "Salvataggio non riuscito. Riprova fra poco." }, { status: 500 });
    }
    return NextResponse.json({ success: true, classi });
  }

  if (azione === "revoca") {
    // Gia revocato: nessun errore, il risultato e quello chiesto.
    if (riga.stato === "revocato") return NextResponse.json({ success: true });
    const { error: erroreUpdate } = await client
      .from("licei_docenti")
      .update({ stato: "revocato", revocato_at: new Date().toISOString(), revocato_da: ctx.userId })
      .eq("id", riga.id)
      .eq("adesione_id", ctx.adesione.id)
      .neq("stato", "revocato");
    if (erroreUpdate) {
      console.error("Licei docenti revoca error:", erroreUpdate.message);
      return NextResponse.json({ error: "Revoca non riuscita. Riprova fra poco." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // ── rimanda_invito ──
  if (riga.stato === "revocato") {
    return NextResponse.json(
      { error: "L'accesso di questo docente è revocato. Per riattivarlo, indicalo di nuovo." },
      { status: 409 },
    );
  }
  const dal = rimandaDal(riga.invito_inviato_at);
  if (dal) {
    return NextResponse.json(
      {
        error: `L'invito è appena partito. Si può rimandare dopo ${RIMANDA_INVITO_MINUTI} minuti, dalle ${oraRoma(dal)}.`,
        rimanda_dal: dal,
      },
      { status: 429 },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "L'invio delle email non è configurato. Ce lo segnali." },
      { status: 503 },
    );
  }

  // Gli stessi controlli dell'invito: nel frattempo l'email o l'account
  // possono essere diventati quelli di uno studente, e un link di accesso
  // da docente non deve partire.
  const { data: profiloRiga, error: erroreProfiloRiga } = await client
    .from("profiles")
    .select("id")
    .eq("email", riga.email.trim().toLowerCase())
    .maybeSingle();
  const bloccata = erroreProfiloRiga
    ? null
    : await legatoAltrove(client, ctx.adesione.id, riga.email.trim().toLowerCase(), [
        riga.user_id,
        (profiloRiga?.id as string | undefined) ?? null,
      ]);
  if (bloccata === null) {
    if (erroreProfiloRiga) console.error("Licei docenti: lettura profilo fallita:", erroreProfiloRiga.message);
    return NextResponse.json({ error: "Invio non riuscito. Riprova fra poco." }, { status: 500 });
  }
  if (bloccata) {
    return NextResponse.json({ error: MESSAGGIO_EMAIL_NON_INVITABILE }, { status: 409 });
  }

  const accesso = await preparaAccessoDocente(client, {
    email: riga.email,
    nome: riga.nome,
    cognome: riga.cognome,
    userId: riga.user_id,
  });
  if (!accesso.ok) return NextResponse.json({ error: accesso.errore }, { status: 500 });

  // L'account puo essere cambiato (cancellato a mano e ricreato): la riga
  // segue quello vero, altrimenti la guardia non lo riconoscerebbe.
  if (accesso.userId !== riga.user_id) {
    const { error: erroreUtente } = await client
      .from("licei_docenti")
      .update({ user_id: accesso.userId })
      .eq("id", riga.id)
      .eq("adesione_id", ctx.adesione.id);
    if (erroreUtente) {
      console.error("Licei docenti: account non aggiornato:", erroreUtente.message);
      return NextResponse.json({ error: "Invio non riuscito. Riprova fra poco." }, { status: 500 });
    }
  }

  const partita = await inviaInvito(client, riga, {
    istituto: ctx.adesione.istituto_denominazione,
    referente: `${ctx.adesione.referente_nome} ${ctx.adesione.referente_cognome}`.trim(),
    setPasswordUrl: accesso.setPasswordUrl,
  });
  if (!partita) {
    // A differenza dell'invito, qui l'email e tutto quello che la chiamata
    // doveva fare: un successo silenzioso lascerebbe il referente convinto
    // di aver rimediato.
    return NextResponse.json({ error: "L'email non è partita. Riprova fra poco." }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
