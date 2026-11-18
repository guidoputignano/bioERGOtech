/**
 * Le email delle prenotazioni per classe: al docente che prenota (biglietto
 * di gruppo con QR, aggiornamenti, promemoria) e l'invito alle scuole del
 * percorso dei licei. Stessa cornice grafica delle email del biglietto
 * (lib/eventi/email.ts).
 *
 * Un solo modello per tutte le occasioni, come per il biglietto delle
 * persone: la scuola e la classe, quante persone, ogni giornata con data,
 * luogo, orario, stato ed eventuale settore, il QR in PNG (Gmail e Outlook
 * non mostrano gli SVG) con il codice in chiaro, il link alla pagina della
 * classe, il calendario per le giornate confermate e poche note pratiche.
 * Una giornata in lista d'attesa lo dice chiaramente: la classe non ha
 * ancora un posto, e se si libera scriviamo noi.
 *
 * I link del calendario portano il codice della classe: calendario.ts lo
 * trasforma nel link alla pagina della classe.
 *
 * Senza rete e senza database: chi invia è in lib/eventi/classi-server.ts.
 */

import {
  EVENT,
  SESSIONS,
  SITE_URL,
  elencoGiornate,
  giornateConArticolo,
  sessionBySlug,
  type EventSession,
} from "@/app/eventi/vivere-piu-a-lungo/content";
import {
  MAX_PERSONE_CLASSE,
  PAGINA_CLASSI,
  descriviPersone,
  urlClasse,
  type GiornataClasse,
  type PrenotazioneClasse,
} from "@/lib/eventi/classi";
import { googleCalendarUrl, icsUrl } from "@/lib/eventi/calendario";
import { EMAIL_RISPOSTE, PIEDE_TESTO, escapeHtml, involucroHtml, type EmailBiglietto } from "@/lib/eventi/email";
import { esitoIscrizione } from "@/lib/eventi/registration";

/**
 * Perché parte l'email della classe:
 * - prenotazione: appena prenotata (o giornate aggiunte con un nuovo invio del modulo);
 * - reinvio: chiesta di nuovo dalla pagina della classe o dallo staff;
 * - aggiornamento: numeri cambiati, giornata aggiunta o tolta, settore assegnato;
 * - posto_liberato: la classe era in lista d'attesa ed è stata confermata;
 * - promemoria: qualche giorno prima dell'evento (cron);
 * - annullamento: una giornata tolta o la prenotazione cancellata.
 */
export type MotivoEmailClasse =
  | "prenotazione"
  | "reinvio"
  | "aggiornamento"
  | "posto_liberato"
  | "promemoria"
  | "annullamento";

export type EmailClasseInput = {
  prenotazione: PrenotazioneClasse;
  motivo: MotivoEmailClasse;
  /** Per posto_liberato: la giornata in cui la classe è stata confermata. */
  giornataLiberata?: string;
  /** Per annullamento: la giornata tolta. */
  giornataAnnullata?: string;
  /** Per annullamento: non resta nessuna giornata, la prenotazione è cancellata. */
  prenotazioneCancellata?: boolean;
};

/** "Vivere più a lungo": c'è in ogni oggetto. */
const NOME_BREVE = EVENT.titolo.split(":")[0];

/** Il nome del percorso dei licei, come nelle sue email. */
const PERCORSO_LICEI = "Biotecnologie e Intelligenza Artificiale";

/** "il 10 dicembre" diventa "Il 10 dicembre", a inizio frase. */
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** ", 10 e 11 dicembre" in coda all'oggetto, o niente se non ci sono giornate. */
const conDate = (slugs: string[]) => {
  const elenco = elencoGiornate(slugs);
  return elenco ? `, ${elenco}` : "";
};

/** "del 10 dicembre", "dell'11 dicembre". */
const dellaGiornata = (slug: string) => {
  const conArt = giornateConArticolo([slug]);
  if (!conArt) return "";
  return conArt.startsWith("l'") ? `dell'${conArt.slice(2)}` : `del ${conArt.replace(/^il /, "")}`;
};

/** Su una riga sola: un a capo scritto nel modulo non deve entrare nell'oggetto. */
const suUnaRiga = (v: string) => v.replace(/\s+/g, " ").trim();

/** "4B" anche se nel modulo è stato scritto "Classe 4B": nel testo diciamo già "la classe". */
const nomeBreveClasse = (classe: string) => suUnaRiga(classe).replace(/^classe\s+/i, "") || suUnaRiga(classe);

/** Un URL dentro un attributo HTML: le "&" dei parametri diventano "&amp;". */
const attr = (url: string) => escapeHtml(url);

/** Le giornate note al sito, nell'ordine dell'evento, con la sessione accanto. */
function giornateNote(giornate: GiornataClasse[]): { g: GiornataClasse; s: EventSession }[] {
  return giornate
    .map((g) => ({ g, s: sessionBySlug(g.slug) }))
    .filter((x): x is { g: GiornataClasse; s: EventSession } => Boolean(x.s))
    .sort((a, b) => a.s.giorno - b.s.giorno);
}

function pillStato(g: GiornataClasse): string {
  return g.status === "lista_attesa"
    ? `<span style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">In lista d'attesa</span>`
    : `<span style="display:inline-block;background:#E1F5EE;color:#0F6E56;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">Confermata</span>`;
}

const pulsante = (url: string, etichetta: string, sfondo: string) =>
  `<a href="${attr(url)}" style="display:inline-block;background:${sfondo};color:#ffffff;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none;">${etichetta}</a>`;

/**
 * Che cosa vuol dire, per una giornata, essere in lista d'attesa. Accanto
 * alla giornata solo quando un'altra è confermata: se lo sono tutte, lo
 * dicono già la prima riga e la nota sopra il QR.
 */
const NOTA_GIORNATA_ATTESA =
  "La classe non ha ancora un posto per questa giornata. Se si liberano abbastanza posti per tutta la classe, la confermiamo e ti scriviamo.";

/** Sopra il QR, quando nessuna giornata è confermata: chi salva il QR non deve scoprire alla porta che non vale. */
const NOTA_QR_ATTESA =
  "La classe è in lista d'attesa: questo codice vale per l'ingresso solo se si libera il posto. In quel caso ti scriviamo noi.";

/** Le note pratiche per il giorno dell'evento (solo con una giornata confermata). */
const NOTE_INGRESSO = [
  "Mostra il QR della classe all'ingresso, dal telefono o stampato: la classe entra insieme.",
  "Porta con te l'elenco della classe, come per ogni uscita didattica.",
  "Arrivate con un po' di anticipo.",
];

/** Vale sempre: è la ragione per cui esiste la prenotazione per classe. */
const NOTA_STUDENTI =
  "Gli studenti che vengono con la classe non devono iscriversi uno per uno: la prenotazione vale per tutta la classe.";

/** Oggetto, titolo e prima riga, secondo l'occasione e lo stato delle giornate. */
function testiPrincipali(
  input: EmailClasseInput,
  note: { g: GiornataClasse; s: EventSession }[],
): { subject: string; titolo: string; intro: string } {
  const p = input.prenotazione;
  const cl = `classe ${nomeBreveClasse(p.classe)}`;
  const Cl = maiuscola(cl);
  const confermate = note.filter((x) => x.g.status === "confermato").map((x) => x.s.slug);
  const inAttesa = note.filter((x) => x.g.status === "lista_attesa").map((x) => x.s.slug);
  const tutte = note.map((x) => x.s.slug);

  switch (input.motivo) {
    case "posto_liberato": {
      const slug = input.giornataLiberata && sessionBySlug(input.giornataLiberata) ? input.giornataLiberata : confermate[0] ?? "";
      const conArt = giornateConArticolo([slug]);
      const quando = conArt ? ` ${conArt}` : "";
      return {
        subject: `Posto confermato per la ${cl}${quando}: ${NOME_BREVE}`,
        titolo: `si è liberato il posto per la ${cl}${quando}.`,
        intro: `La classe era in lista d'attesa: ora è confermata${quando}, per tutte le ${p.posti} persone della prenotazione. Qui sotto trovi il QR da mostrare all'ingresso.`,
      };
    }
    case "promemoria": {
      if (confermate.length) {
        const una = confermate.length === 1 ? sessionBySlug(confermate[0]) : undefined;
        const dove = una ? ` al ${una.luogoBreve}` : "";
        return {
          subject: `Ci vediamo ${giornateConArticolo(confermate)}${dove} con la ${cl}: ${NOME_BREVE}`,
          titolo: `ci vediamo ${giornateConArticolo(confermate)}${dove} con la ${cl}.`,
          intro: "Ti ricordiamo dove e quando, con il QR della classe da mostrare all'ingresso.",
        };
      }
      if (inAttesa.length) {
        return {
          subject: `${NOME_BREVE}: la ${cl} è ancora in lista d'attesa`,
          titolo: `la ${cl} è ancora in lista d'attesa.`,
          intro: `Per ${giornateConArticolo(inAttesa)} non c'è ancora posto per tutta la classe: la classe è in lista d'attesa. Se si liberano abbastanza posti, ti scriviamo noi.`,
        };
      }
      break;
    }
    case "aggiornamento":
      return {
        subject: `Prenotazione aggiornata, ${cl}: ${NOME_BREVE}${conDate(tutte)}`,
        titolo: `la prenotazione della ${cl} è aggiornata.`,
        intro: "Qui sotto trovi la prenotazione com'è adesso, giornata per giornata. Il codice e il QR non cambiano.",
      };
    case "reinvio":
      return {
        subject: `La prenotazione della ${cl}: ${NOME_BREVE}${conDate(tutte)}`,
        titolo: `ecco la prenotazione della ${cl}.`,
        // La rimanda il docente o lo staff (anche a chi non l'ha chiesta): niente "come richiesto".
        intro: `Ti rimandiamo la prenotazione con il codice e il QR della classe${confermate.length ? " da mostrare all'ingresso" : ""}.`,
      };
    case "annullamento": {
      const slug = input.giornataAnnullata ?? "";
      const conArt = giornateConArticolo([slug]);
      if (input.prenotazioneCancellata) {
        return {
          subject: `Prenotazione annullata, ${cl}: ${NOME_BREVE}`,
          titolo: `la prenotazione della ${cl} è annullata.`,
          intro: `${conArt ? `Abbiamo tolto ${conArt} dalla prenotazione` : "Abbiamo tolto l'ultima giornata dalla prenotazione"}. Non c'erano altre giornate, quindi la prenotazione è annullata e il codice ${p.codice} non vale più per l'ingresso. Grazie per averci avvisato.`,
        };
      }
      const della = dellaGiornata(slug);
      const resta = [
        ...(confermate.length ? [`resta confermata per ${giornateConArticolo(confermate)}`] : []),
        ...(inAttesa.length ? [`resta in lista d'attesa per ${giornateConArticolo(inAttesa)}`] : []),
      ].join(" e ");
      return {
        subject: `${della ? `Tolta la giornata ${della}` : "Tolta una giornata"}, ${cl}: ${NOME_BREVE}`,
        titolo: `${della ? `la giornata ${della}` : "una giornata"} è stata tolta dalla prenotazione della ${cl}.`,
        intro: `${resta ? `La classe ${resta}: qui sotto` : "Qui sotto"} trovi la prenotazione aggiornata. Il codice e il QR non cambiano. Grazie per averci avvisato.`,
      };
    }
    case "prenotazione":
    default:
      break;
  }

  const esito = esitoIscrizione(note.map((x) => x.g));
  if (esito === "nessuna") {
    // Non deve succedere: la rotta si ferma prima. Se succede, niente
    // "confermata": si dice com'è e a chi scrivere.
    return {
      subject: `Prenotazione ricevuta, ${cl}: ${NOME_BREVE}`,
      titolo: `abbiamo ricevuto la prenotazione della ${cl}.`,
      intro: `Al momento non risulta nessuna giornata collegata alla prenotazione: scrivici a ${EMAIL_RISPOSTE} e sistemiamo subito.`,
    };
  }
  if (esito === "attesa") {
    return {
      subject: `${Cl} in lista d'attesa: ${NOME_BREVE}${conDate(inAttesa)}`,
      titolo: `la ${cl} è in lista d'attesa per ${giornateConArticolo(inAttesa)}.`,
      intro: `Abbiamo ricevuto la prenotazione, ma ${inAttesa.length > 1 ? "in queste giornate" : `per la giornata ${dellaGiornata(inAttesa[0])}`} al momento non ci sono abbastanza posti per tutta la classe: la classe è in lista d'attesa e non ha ancora un posto. Se si liberano abbastanza posti, la confermiamo e ti scriviamo noi.`,
    };
  }
  if (esito === "parziale") {
    return {
      subject: `${Cl} confermata ${giornateConArticolo(confermate)}, in lista d'attesa ${giornateConArticolo(inAttesa)}: ${NOME_BREVE}`,
      titolo: `la ${cl} è confermata per ${giornateConArticolo(confermate)}.`,
      intro: `Grazie per la prenotazione. Per ${giornateConArticolo(inAttesa)} al momento non ci sono abbastanza posti per tutta la classe: lì la classe è in lista d'attesa e, se si liberano abbastanza posti, ti scriviamo noi.`,
    };
  }
  return {
    subject: `${Cl} prenotata: ${NOME_BREVE}${conDate(confermate)}`,
    titolo: `la ${cl} è confermata per ${giornateConArticolo(confermate)}.`,
    intro:
      "Grazie per la prenotazione. Qui sotto trovi il QR della classe: mostralo all'ingresso, dal telefono o stampato, e la classe entra insieme.",
  };
}

/** L'oggetto, l'HTML e il testo semplice dell'email della classe. */
export function emailClasse(input: EmailClasseInput): EmailBiglietto {
  const p = input.prenotazione;
  const cancellata = input.motivo === "annullamento" && input.prenotazioneCancellata === true;
  // Nell'avviso di annullamento la giornata tolta non c'è più, anche se chi
  // chiama passa la prenotazione com'era prima.
  const giornate =
    input.motivo === "annullamento" ? p.giornate.filter((g) => g.slug !== input.giornataAnnullata) : p.giornate;
  const note = cancellata ? [] : giornateNote(giornate);
  const { subject, titolo, intro } = testiPrincipali(input, note);

  const nome = suUnaRiga(p.docente_nome);
  const codice = p.codice;
  const codiceHtml = escapeHtml(codice);
  const paginaUrl = `${SITE_URL}${urlClasse(codice)}`;
  const qrUrl = `${SITE_URL}/api/eventi/qr/${encodeURIComponent(codice)}`;
  const prenotaUrl = `${SITE_URL}${PAGINA_CLASSI}`;
  const confermate = note.filter((x) => x.g.status === "confermato").map((x) => x.s.slug);
  const inAttesa = note.filter((x) => x.g.status === "lista_attesa").map((x) => x.s.slug);
  const soloAttesa = confermate.length === 0 && inAttesa.length > 0;

  const scuola = `${suUnaRiga(p.istituto)}${p.comune ? ` (${suUnaRiga(p.comune)})` : ""}`;
  const persone = `${descriviPersone(p.studenti, p.accompagnatori)}, ${p.posti} in tutto`;
  const docente = `${nome} ${suUnaRiga(p.docente_cognome)}`.trim();

  /* ── HTML ── */

  const rigaDato = (etichetta: string, valore: string) =>
    `<tr><td style="padding:3px 12px 3px 0;color:#718096;font-size:13px;vertical-align:top;white-space:nowrap;">${etichetta}</td><td style="padding:3px 0;color:#0A1628;font-size:14px;font-weight:600;line-height:1.5;">${valore}</td></tr>`;
  const riepilogo = `<div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:12px;">
        <table role="presentation" style="border-collapse:collapse;">
          ${rigaDato("Scuola", escapeHtml(scuola))}
          ${rigaDato("Classe", escapeHtml(nomeBreveClasse(p.classe)))}
          ${rigaDato("Persone", escapeHtml(persone))}
          ${rigaDato("Docente", escapeHtml(docente))}
        </table>
      </div>`;

  const schede = note
    .map(({ g, s }) => {
      const settore = g.settore?.trim()
        ? `<p style="margin:10px 0 0;color:#0A1628;font-size:14px;"><strong>Settore:</strong> ${escapeHtml(suUnaRiga(g.settore))}</p>`
        : "";
      const attesa =
        g.status === "lista_attesa" && !soloAttesa
          ? `<p style="background:#FEF6E7;color:#7A4B00;font-size:13px;line-height:1.5;border-radius:8px;padding:10px 12px;margin:10px 0 0;">${NOTA_GIORNATA_ATTESA}</p>`
          : "";
      const calendario =
        g.status === "confermato"
          ? `<p style="margin:10px 0 0;"><a href="${attr(googleCalendarUrl(s, codice))}" style="color:#008F6B;font-size:13px;font-weight:600;text-decoration:none;">Aggiungi a Google Calendar</a></p>`
          : "";
      return `
      <tr><td style="padding:0 0 12px;">
        <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
            <td style="vertical-align:top;">
              <p style="margin:0;color:#0A1628;font-size:16px;font-weight:700;">${s.giornoLabel}</p>
              <p style="margin:4px 0 0;color:#4A5568;font-size:14px;line-height:1.5;">${s.orario}<br>
                <a href="${attr(s.mappaUrl)}" style="color:#4A5568;">${s.luogo}</a></p>
              <p style="margin:6px 0 0;color:#718096;font-size:13px;">${s.titolo}</p>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:8px;">${pillStato(g)}</td>
          </tr></table>
          ${settore}${attesa}${calendario}
        </div>
      </td></tr>`;
    })
    .join("");

  const ics = confermate.length
    ? `<p style="margin:0 0 24px;color:#4A5568;font-size:13px;line-height:1.6;">Usi Apple Calendar o Outlook? <a href="${attr(icsUrl(confermate, codice))}" style="color:#008F6B;font-weight:600;">Scarica il file del calendario</a>.</p>`
    : "";

  const qr = `<div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Il QR della classe</p>
        ${soloAttesa ? `<p style="background:#FEF6E7;color:#7A4B00;font-size:13px;line-height:1.5;text-align:left;border-radius:8px;padding:10px 12px;margin:0 0 14px;">${NOTA_QR_ATTESA}</p>` : ""}<img src="${attr(qrUrl)}" width="220" height="220" alt="QR code della classe, codice ${codiceHtml}" style="display:block;margin:0 auto;width:220px;height:220px;border:1px solid #E2E8F0;border-radius:8px;" />
        <p style="color:#0A1628;font-size:24px;font-weight:800;letter-spacing:0.12em;font-family:'SFMono-Regular',Menlo,Consolas,monospace;margin:14px 0 4px;">${codiceHtml}</p>
        <p style="color:#718096;font-size:13px;margin:0 0 16px;">Un solo codice per tutta la classe. Se il QR non si vede, all'ingresso basta questo codice.</p>
        ${pulsante(paginaUrl, "Apri la pagina della classe", "#0A1628")}
      </div>`;

  const elencoNote = [...(confermate.length ? NOTE_INGRESSO : []), NOTA_STUDENTI];
  const daSapere = `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="color:#065f46;font-size:14px;font-weight:700;margin:0 0 6px;">${confermate.length ? "Il giorno dell'evento" : "Da sapere"}</p>
        <ul style="color:#065f46;font-size:14px;line-height:1.6;margin:0;padding-left:20px;">${elencoNote
          .map((t) => `<li style="margin:0 0 4px;">${t}</li>`)
          .join("")}</ul>
      </div>`;

  const cambiare = confermate.length
    ? `Se cambia il numero di studenti o di docenti, o se la classe non può più venire, aggiorna la prenotazione dalla <a href="${attr(paginaUrl)}" style="color:#008F6B;font-weight:600;">pagina della classe</a> prima che la giornata inizi: i posti liberati passano a chi è in lista d'attesa.`
    : `Se cambia il numero di studenti o di docenti, o se la classe non è più interessata, aggiorna la prenotazione dalla <a href="${attr(paginaUrl)}" style="color:#008F6B;font-weight:600;">pagina della classe</a>.`;
  const altraClasse =
    input.motivo === "prenotazione"
      ? `<p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">Per un'altra classe serve una prenotazione a parte, una per classe e fino a ${MAX_PERSONE_CLASSE} persone docenti compresi: <a href="${attr(prenotaUrl)}" style="color:#008F6B;font-weight:600;">prenota un'altra classe</a>.</p>`
      : "";

  const nonSeiTu =
    input.motivo === "annullamento" || input.motivo === "aggiornamento"
      ? `<div style="background:#FEF6E7;border-left:3px solid #B7791F;border-radius:0 6px 6px 0;padding:14px 18px;margin:16px 0 8px;">
        <p style="color:#7A4B00;font-size:14px;line-height:1.6;margin:0;">${
          input.motivo === "annullamento" ? "Se non sei tu ad averlo chiesto" : "Se non riconosci questa modifica"
        }, scrivi a <a href="mailto:${EMAIL_RISPOSTE}" style="color:#7A4B00;font-weight:700;">${EMAIL_RISPOSTE}</a>.</p>
      </div>`
      : "";

  // Che cosa fare se si cambia idea dopo aver tolto una giornata.
  const conArtAnnullata = giornateConArticolo([input.giornataAnnullata ?? ""]);
  const ripensamento = cancellata
    ? "Se cambi idea, puoi prenotare di nuovo dalla pagina per le scuole: riceverai un nuovo codice. Se non ci sono abbastanza posti per tutta la classe, entra in lista d'attesa in ordine di prenotazione."
    : input.motivo === "annullamento" && conArtAnnullata
      ? `Se cambi idea, puoi aggiungere di nuovo ${conArtAnnullata} dalla pagina della classe, prima che la giornata inizi. Se non ci sono abbastanza posti per tutta la classe, entra in lista d'attesa in ordine di prenotazione.`
      : "";
  const ripensamentoBox = ripensamento
    ? `<div style="background:#E1F5EE;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#065f46;font-size:14px;line-height:1.6;">${ripensamento}</p>
        ${cancellata ? pulsante(prenotaUrl, "Prenota di nuovo", "#0F6E56") : pulsante(paginaUrl, "Apri la pagina della classe", "#0F6E56")}
      </div>`
    : "";

  const corpo = cancellata
    ? `${riepilogo}
      <div style="height:12px;"></div>
      ${ripensamentoBox}
      ${nonSeiTu}`
    : `${riepilogo}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:12px;">${schede}</table>
      ${ics}
      ${qr}
      ${daSapere}
      ${ripensamentoBox}
      <p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">${cambiare}</p>
      ${altraClasse}
      ${nonSeiTu}`;

  const html = involucroHtml({ subject, saluto: `Gentile ${escapeHtml(nome)}, ${escapeHtml(titolo)}`, intro, corpo });

  /* ── Testo semplice ── */

  const righeGiornate = note.map(({ g, s }) =>
    [
      `- ${s.giornoLabel}, ${s.orario}, ${s.luogo}: ${g.status === "lista_attesa" ? "in lista d'attesa" : "confermata"}`,
      ...(g.settore?.trim() ? [`  Settore: ${suUnaRiga(g.settore)}`] : []),
      ...(g.status === "lista_attesa" && !soloAttesa ? [`  ${NOTA_GIORNATA_ATTESA}`] : []),
    ].join("\n"),
  );
  const testoCambiare = confermate.length
    ? `Se cambia il numero di studenti o di docenti, o se la classe non può più venire, aggiorna la prenotazione dalla pagina della classe prima che la giornata inizi: i posti liberati passano a chi è in lista d'attesa.`
    : `Se cambia il numero di studenti o di docenti, o se la classe non è più interessata, aggiorna la prenotazione dalla pagina della classe.`;

  const text = [
    `Gentile ${nome}, ${titolo}`,
    "",
    intro,
    "",
    `Scuola: ${scuola}`,
    `Classe: ${nomeBreveClasse(p.classe)}`,
    `Persone: ${persone}`,
    `Docente: ${docente}`,
    ...(cancellata
      ? ["", ripensamento, `Prenota di nuovo: ${prenotaUrl}`]
      : [
          ...(righeGiornate.length ? ["", ...righeGiornate] : []),
          "",
          ...(soloAttesa ? [NOTA_QR_ATTESA] : []),
          `Il codice della classe: ${codice}`,
          `La pagina della classe, con il QR: ${paginaUrl}`,
          ...(confermate.length ? [`Aggiungi al calendario (Apple, Outlook): ${icsUrl(confermate, codice)}`] : []),
          "",
          ...elencoNote.map((t) => `- ${t}`),
          ...(ripensamento ? ["", ripensamento] : []),
          "",
          testoCambiare,
          ...(input.motivo === "prenotazione"
            ? [`Per un'altra classe serve una prenotazione a parte: ${prenotaUrl}`]
            : []),
        ]),
    ...(input.motivo === "annullamento"
      ? ["", `Se non sei tu ad averlo chiesto, scrivi a ${EMAIL_RISPOSTE}.`]
      : input.motivo === "aggiornamento"
        ? ["", `Se non riconosci questa modifica, scrivi a ${EMAIL_RISPOSTE}.`]
        : []),
    ...PIEDE_TESTO,
  ].join("\n");

  return { subject: suUnaRiga(subject), html, text };
}

/* ── L'invito ai referenti del percorso dei licei ──────────────────── */

export type EmailInvitoScuolaInput = {
  /** Nome del docente referente del percorso. */
  nome: string;
  istituto: string;
  /** Il codice dell'adesione (LIC-XXXXXXXX): il link riempie il modulo con la scuola. */
  codiceAdesione: string;
};

/** Il link al modulo delle scuole con la scuola già scritta. */
export const linkInvitoScuola = (codiceAdesione: string): string =>
  `${SITE_URL}${PAGINA_CLASSI}?scuola=${encodeURIComponent(codiceAdesione.trim())}`;

/**
 * L'invito ai referenti del percorso dei licei: portate le vostre classi il
 * 10 (e l'11) dicembre. Con il voi, rivolto alla scuola, come l'oggetto e
 * il titolo ("venite", "vi aspettiamo"): le email del percorso ai referenti
 * usano il lei, quelle dell'evento e la cornice comune ("rispondi a questa
 * email") il tu, e il voi sta bene fra i due.
 */
export function emailInvitoScuola(input: EmailInvitoScuolaInput): EmailBiglietto {
  const nome = suUnaRiga(input.nome);
  const istituto = suUnaRiga(input.istituto);
  const link = linkInvitoScuola(input.codiceAdesione);
  const [primo, ...altri] = SESSIONS;

  const subject = `${NOME_BREVE}, ${primo.etichetta}: venite con le vostre classi`;
  const titolo = "vi aspettiamo con le vostre classi.";
  const intro = `Il percorso «${PERCORSO_LICEI}» si conclude con l'evento «${NOME_BREVE}»: ${primo.giornoLabel.toLowerCase()} al ${primo.luogoBreve} di Taranto le squadre finaliste presentano i loro progetti. Ci farebbe molto piacere che ad assistere ci fossero anche le classi della vostra scuola.`;

  const giornata = (s: EventSession) => `${s.giornoLabel}, ${s.orario}, ${s.luogo}: ${s.titolo.toLowerCase()}.`;
  const programma = [primo, ...altri].map(giornata);
  const comeFunziona = [
    `Una prenotazione per classe, fino a ${MAX_PERSONE_CLASSE} persone docenti compresi. Per più classi serve una prenotazione per ciascuna: ogni docente può prenotare la propria.`,
    "Bastano i numeri: nessun dato degli studenti, che non devono iscriversi uno per uno.",
    "Ogni classe riceve per email un QR: all'ingresso la classe entra insieme.",
    "L'ingresso è gratuito. I posti per le scuole sono limitati: le classi si confermano in ordine di prenotazione e, quando i posti finiscono, entrano in lista d'attesa.",
  ];
  const altreGiornate = altri.length
    ? ` Si può venire anche ${giornateConArticolo(altri.map((s) => s.slug))} al ${altri.map((s) => s.luogoBreve).join(" e ")}, o a tutte e due le giornate.`
    : "";
  const linkNota = `Il link riempie già il nome della scuola (${istituto}). Potete inoltrarlo ai colleghi: ogni docente prenota la propria classe e riceve il QR per email.`;

  const p = (testo: string, margine = "0 0 16px") =>
    `<p style="color:#4A5568;font-size:15px;line-height:1.7;margin:${margine};">${testo}</p>`;
  const corpo = `<div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
        <p style="color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Il programma</p>
        ${programma.map((t) => `<p style="color:#0A1628;font-size:14px;line-height:1.6;margin:0 0 6px;">${t}</p>`).join("")}
        <p style="color:#4A5568;font-size:13px;line-height:1.6;margin:8px 0 0;">${escapeHtml(altreGiornate.trim())}</p>
      </div>
      <p style="color:#0A1628;font-size:15px;font-weight:700;margin:0 0 8px;">Come si prenota</p>
      <ul style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 20px;padding-left:22px;">${comeFunziona
        .map((t) => `<li style="margin:0 0 6px;">${t}</li>`)
        .join("")}</ul>
      <div style="text-align:center;margin:0 0 20px;">${pulsante(link, "Prenota una classe", "#0F6E56")}</div>
      ${p(escapeHtml(linkNota), "0 0 8px")}`;

  const html = involucroHtml({ subject, saluto: `Gentile ${escapeHtml(nome)}, ${titolo}`, intro, corpo });

  const text = [
    `Gentile ${nome}, ${titolo}`,
    "",
    intro,
    "",
    "Il programma:",
    ...programma.map((t) => `- ${t}`),
    ...(altreGiornate ? [altreGiornate.trim()] : []),
    "",
    "Come si prenota:",
    ...comeFunziona.map((t) => `- ${t}`),
    "",
    `Prenota una classe: ${link}`,
    linkNota,
    ...PIEDE_TESTO,
  ].join("\n");

  return { subject, html, text };
}
