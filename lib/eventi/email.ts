/**
 * L'email del biglietto dell'evento, in tutte le sue occasioni: dopo
 * l'iscrizione, quando lo staff lo rimanda, quando si libera un posto dalla
 * lista d'attesa, il biglietto aggiornato e il promemoria prima dell'evento.
 *
 * Un solo modello, così il biglietto è sempre lo stesso: le giornate con la
 * data (mai "Giorno 1"), lo stato di ciascuna, il QR in PNG (Gmail e Outlook
 * non mostrano gli SVG), il codice in chiaro, il calendario e il link per
 * liberare il posto. Stile coerente con le altre email transazionali del
 * sito: header scuro, accento verde, corpo chiaro. Niente trattini lunghi.
 *
 * Senza rete e senza database: chi invia è in lib/eventi/evento-server.ts.
 */

import {
  EVENT,
  EVENT_SLUG,
  SITE_URL,
  sessionBySlug,
  elencoGiornate,
  giornateConArticolo,
  type EventSession,
} from "@/app/eventi/vivere-piu-a-lungo/content";
import { esitoIscrizione, type SessionStatus } from "@/lib/eventi/registration";
import { googleCalendarUrl, icsUrl, urlBiglietto } from "@/lib/eventi/calendario";

export type GiornataEmail = { slug: string; status: SessionStatus };

export type MotivoEmail =
  /** Subito dopo l'iscrizione (anche quando ci si reiscrive con la stessa email). */
  | "iscrizione"
  /** Lo staff o la persona chiedono di nuovo il biglietto. */
  | "reinvio"
  /** Lo staff ha confermato un posto dalla lista d'attesa. */
  | "posto_liberato"
  /** Il biglietto aggiornato, mandato una volta a tutti gli iscritti. */
  | "aggiornamento"
  /** Il promemoria prima dell'evento. */
  | "promemoria";

export type EmailBigliettoInput = {
  nome: string;
  codice: string;
  /** Tutte le giornate che la persona ha, non solo quelle appena scelte. */
  giornate: GiornataEmail[];
  motivo: MotivoEmail;
  /** posto_liberato: la giornata appena confermata. */
  giornataLiberata?: string;
  /** iscrizione: l'account del Member Portal è stato appena creato. */
  nuovoAccount?: boolean;
  /**
   * Le giornate che la persona non ha e che può ancora aggiungere (con
   * posti liberi): l'email la invita a venire anche quel giorno, con un link
   * al biglietto che la aggiunge.
   */
  aggiungibili?: string[];
};

export type EmailBiglietto = { subject: string; html: string; text: string };

/** L'indirizzo a cui rispondere: le risposte "non posso venire" arrivano a qualcuno. */
export const EMAIL_RISPOSTE = "info@bioergotech.org";
export const EMAIL_MITTENTE = "Fondazione bioERGOtech <noreply@bioergotech.org>";

const NOME_BREVE = EVENT.titolo.split(":")[0]; // "Vivere più a lungo"

/** ", 10 e 11 dicembre" in coda all'oggetto, o niente se non ci sono giornate. */
const conDate = (slugs: string[]) => {
  const elenco = elencoGiornate(slugs);
  return elenco ? `, ${elenco}` : "";
};

/** Il testo scritto da chi si iscrive non deve diventare HTML. */
export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Le giornate note al sito, nell'ordine dell'evento, con la sessione accanto. */
function giornateNote(giornate: GiornataEmail[]): { g: GiornataEmail; s: EventSession }[] {
  return giornate
    .map((g) => ({ g, s: sessionBySlug(g.slug) }))
    .filter((x): x is { g: GiornataEmail; s: EventSession } => Boolean(x.s))
    .sort((a, b) => a.s.giorno - b.s.giorno);
}

/** Oggetto, titolo e prima riga, secondo l'occasione e lo stato delle giornate. */
function testiPrincipali(input: EmailBigliettoInput): { subject: string; titolo: string; intro: string } {
  const note = giornateNote(input.giornate);
  const confermate = note.filter((x) => x.g.status === "confermato").map((x) => x.s.slug);
  const inAttesa = note.filter((x) => x.g.status === "lista_attesa").map((x) => x.s.slug);
  const esito = esitoIscrizione(note.map((x) => x.g));
  const tutte = note.map((x) => x.s.slug);

  switch (input.motivo) {
    case "posto_liberato": {
      const slug = input.giornataLiberata ?? confermate[0] ?? "";
      const conArt = giornateConArticolo([slug]);
      const per = conArt ? ` per ${conArt}` : "";
      return {
        subject: `Si è liberato un posto${per}: ${NOME_BREVE}`,
        titolo: `si è liberato un posto${per}.`,
        intro: `Eri in lista d'attesa: ora il tuo posto${per} è confermato. Qui sotto trovi il biglietto da mostrare all'ingresso.`,
      };
    }
    case "promemoria": {
      const una = confermate.length === 1 ? sessionBySlug(confermate[0]) : undefined;
      const dove = una ? ` al ${una.luogoBreve}` : "";
      return {
        subject: confermate.length
          ? `Ci vediamo ${giornateConArticolo(confermate)}${dove}: ${NOME_BREVE}`
          : `${NOME_BREVE}: sei ancora in lista d'attesa`,
        titolo: confermate.length ? `ci vediamo ${giornateConArticolo(confermate)}${dove}.` : "sei ancora in lista d'attesa.",
        intro: confermate.length
          ? "Ti ricordiamo dove e quando, con il biglietto da mostrare all'ingresso. Se non puoi più venire, libera il posto: lo diamo a chi è in lista d'attesa."
          : "Le giornate che hai scelto sono ancora al completo. Se si libera un posto ti scriviamo subito.",
      };
    }
    case "aggiornamento":
      return {
        subject: `Il tuo biglietto aggiornato: ${NOME_BREVE}${conDate(tutte)}`,
        titolo: "ecco il tuo biglietto aggiornato.",
        intro:
          "Abbiamo aggiornato il biglietto: ora il QR si vede in tutte le app di posta e ogni giornata riporta la data, il luogo e lo stato del tuo posto. Il codice non cambia.",
      };
    case "reinvio":
      return {
        subject: `Il tuo biglietto: ${NOME_BREVE}${conDate(tutte)}`,
        titolo: "ecco il tuo biglietto.",
        intro: "Come richiesto, ti rimandiamo il biglietto con il codice e il QR da mostrare all'ingresso.",
      };
    case "iscrizione":
    default:
      if (esito === "nessuna") {
        // Non deve succedere: la rotta si ferma prima. Se succede, niente
        // "confermato": si dice com'è e a chi scrivere.
        return {
          subject: `La tua iscrizione: ${NOME_BREVE}`,
          titolo: "abbiamo ricevuto la tua iscrizione.",
          intro: `Grazie per l'iscrizione. Al momento non risulta nessuna giornata collegata al tuo biglietto: scrivici a ${EMAIL_RISPOSTE} e sistemiamo subito.`,
        };
      }
      if (esito === "attesa") {
        return {
          subject: `Sei in lista d'attesa: ${NOME_BREVE}${conDate(inAttesa)}`,
          titolo: `sei in lista d'attesa per ${giornateConArticolo(inAttesa)}.`,
          intro: `Grazie per l'iscrizione. I posti per ${inAttesa.length > 1 ? "le giornate che hai scelto" : "la giornata che hai scelto"} sono al momento esauriti. Se si libera un posto ti scriviamo noi, e il biglietto qui sotto diventa valido.`,
        };
      }
      if (esito === "parziale") {
        return {
          subject: `Iscrizione confermata per ${giornateConArticolo(confermate)}, lista d'attesa per ${giornateConArticolo(inAttesa)}`,
          titolo: `il tuo posto per ${giornateConArticolo(confermate)} è confermato.`,
          intro: `Grazie per l'iscrizione. Per ${giornateConArticolo(inAttesa)} i posti sono al momento esauriti: sei in lista d'attesa e, se si libera un posto, ti scriviamo noi.`,
        };
      }
      return {
        subject: `Iscrizione confermata: ${NOME_BREVE}${conDate(confermate)}`,
        titolo: `il tuo posto ${confermate.length > 1 ? "è confermato per tutte e due le giornate" : `per ${giornateConArticolo(confermate)} è confermato`}.`,
        intro: "Grazie per l'iscrizione. Qui sotto trovi il biglietto: mostralo all'ingresso, dal telefono o stampato.",
      };
  }
}

function pillStato(status: SessionStatus): string {
  return status === "lista_attesa"
    ? `<span style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">Lista d'attesa</span>`
    : `<span style="display:inline-block;background:#E1F5EE;color:#0F6E56;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">Confermato</span>`;
}

/** Un URL dentro un attributo HTML: le "&" dei parametri diventano "&amp;". */
const attr = (url: string) => escapeHtml(url);

/** L'oggetto, l'HTML e il testo semplice dell'email del biglietto. */
export function emailBiglietto(input: EmailBigliettoInput): EmailBiglietto {
  const nome = escapeHtml(input.nome.trim());
  const codice = input.codice;
  const codiceHtml = escapeHtml(codice);
  const ticketUrl = urlBiglietto(codice);
  const qrUrl = `${SITE_URL}/api/eventi/qr/${encodeURIComponent(codice)}`;
  const note = giornateNote(input.giornate);
  const { subject, titolo, intro } = testiPrincipali(input);
  const aggiungibili = (input.aggiungibili ?? [])
    .map((slug) => sessionBySlug(slug))
    .filter((s): s is EventSession => Boolean(s) && !note.some((x) => x.s.slug === s!.slug));

  const schede = note
    .map(({ g, s }) => {
      const calendario =
        g.status === "confermato"
          ? `<a href="${attr(googleCalendarUrl(s, codice))}" style="color:#008F6B;font-size:13px;font-weight:600;text-decoration:none;">Aggiungi a Google Calendar</a>`
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
            <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:8px;">${pillStato(g.status)}</td>
          </tr></table>
          ${calendario ? `<p style="margin:10px 0 0;">${calendario}</p>` : ""}
        </div>
      </td></tr>`;
    })
    .join("");

  const confermate = note.filter((x) => x.g.status === "confermato").map((x) => x.s.slug);
  const inAttesa = note.filter((x) => x.g.status === "lista_attesa").map((x) => x.s.slug);
  const ics = confermate.length
    ? `<p style="margin:0 0 24px;color:#4A5568;font-size:13px;line-height:1.6;">Usi Apple Calendar o Outlook? <a href="${attr(icsUrl(confermate, codice))}" style="color:#008F6B;font-weight:600;">Scarica il file del calendario</a>.</p>`
    : "";

  const invito = aggiungibili.length
    ? `<div style="background:#E1F5EE;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#0F6E56;font-size:15px;font-weight:700;">Vuoi venire anche ${giornateConArticolo(aggiungibili.map((s) => s.slug))}?</p>
        <p style="margin:0 0 12px;color:#065f46;font-size:14px;line-height:1.6;">${aggiungibili
          .map((s) => `${s.giornoLabel}, ${s.orario}, ${s.luogo}: ${s.titolo.toLowerCase()}.`)
          .join("<br>")} Ci sono ancora posti liberi.</p>
        ${aggiungibili
          .map(
            (s) =>
              `<a href="${attr(`${ticketUrl}?aggiungi=${encodeURIComponent(s.slug)}`)}" style="display:inline-block;background:#0F6E56;color:#ffffff;font-size:14px;font-weight:700;padding:11px 18px;border-radius:8px;text-decoration:none;margin:0 8px 6px 0;">Aggiungi ${giornateConArticolo([s.slug])}</a>`,
          )
          .join("")}
      </div>`
    : "";

  const account = input.nuovoAccount
    ? `<div style="background:#f0fdf9;border-left:3px solid #00C896;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0;">Con l'iscrizione abbiamo creato anche il tuo account gratuito nel Member Portal della Fondazione. Per scegliere la password, <a href="${attr(`${SITE_URL}/auth/forgot-password`)}" style="color:#008F6B;font-weight:700;">apri questa pagina</a> e scrivi il tuo indirizzo email.</p>
      </div>`
    : "";

  const gestisciUrl = attr(`${ticketUrl}#gestisci`);
  const libera = confermate.length
    ? `<p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">Se cambi programma, <a href="${gestisciUrl}" style="color:#008F6B;font-weight:600;">libera il posto dal biglietto online</a>: lo diamo a chi è in lista d'attesa.</p>`
    : inAttesa.length
      ? `<p style="color:#718096;font-size:13px;line-height:1.6;margin:0 0 8px;">Se non ti interessa più, <a href="${gestisciUrl}" style="color:#008F6B;font-weight:600;">esci dalla lista d'attesa dal biglietto online</a>.</p>`
      : "";

  // La riga di anteprima che le app di posta mostrano accanto all'oggetto.
  const anteprima = escapeHtml(intro);

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:16px 8px;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${anteprima}</div>
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A1628;padding:28px 36px;border-radius:12px 12px 0 0;">
      <p style="color:#00C896;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0;">Fondazione bioERGOtech</p>
      <p style="color:#ffffff;font-size:20px;font-weight:700;margin:6px 0 0;">${EVENT.titolo}</p>
      <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">${EVENT.dataLabel}, ${EVENT.citta}. Ingresso gratuito.</p>
    </div>

    <div style="padding:32px 36px;background:#F8FAFB;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;">
      <h1 style="color:#0A1628;font-size:20px;line-height:1.4;margin:0 0 10px;font-weight:700;">Ciao ${nome}, ${titolo}</h1>
      <p style="color:#4A5568;font-size:15px;line-height:1.7;margin:0 0 24px;">${intro}</p>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:12px;">${schede}</table>
      ${ics}

      <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#718096;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Il tuo biglietto</p>
        <img src="${attr(qrUrl)}" width="220" height="220" alt="QR code del biglietto, codice ${codiceHtml}" style="display:block;margin:0 auto;width:220px;height:220px;border:1px solid #E2E8F0;border-radius:8px;" />
        <p style="color:#0A1628;font-size:24px;font-weight:800;letter-spacing:0.12em;font-family:'SFMono-Regular',Menlo,Consolas,monospace;margin:14px 0 4px;">${codiceHtml}</p>
        <p style="color:#718096;font-size:13px;margin:0 0 16px;">Se il QR non si vede, all'ingresso basta questo codice.</p>
        <a href="${attr(ticketUrl)}" style="display:inline-block;background:#0A1628;color:#ffffff;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px;text-decoration:none;">Apri il biglietto online</a>
      </div>

      ${invito}
      ${account}
      ${libera}

      <hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0 20px;" />
      <p style="color:#718096;font-size:12px;margin:0;line-height:1.6;">
        Per qualsiasi domanda rispondi a questa email o scrivi a <a href="mailto:${EMAIL_RISPOSTE}" style="color:#008F6B;">${EMAIL_RISPOSTE}</a>.<br>
        Fondazione bioERGOtech, Taranto. <a href="${attr(`${SITE_URL}/eventi/${EVENT_SLUG}`)}" style="color:#008F6B;">Il programma dell'evento</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const righeGiornate = note
    .map(
      ({ g, s }) =>
        `- ${s.giornoLabel}, ${s.orario}, ${s.luogo}: ${g.status === "lista_attesa" ? "lista d'attesa" : "confermato"}`,
    )
    .join("\n");
  const text = [
    `Ciao ${input.nome.trim()}, ${titolo}`,
    "",
    intro,
    ...(righeGiornate ? ["", righeGiornate] : []),
    "",
    `Il tuo codice: ${codice}`,
    `Il biglietto online, con il QR: ${ticketUrl}`,
    ...(confermate.length ? [`Aggiungi al calendario (Apple, Outlook): ${icsUrl(confermate, codice)}`] : []),
    ...(aggiungibili.length
      ? [
          "",
          ...aggiungibili.map(
            (s) => `Vuoi venire anche ${giornateConArticolo([s.slug])}? Aggiungi la giornata qui: ${ticketUrl}?aggiungi=${encodeURIComponent(s.slug)}`,
          ),
        ]
      : []),
    ...(input.nuovoAccount
      ? ["", `Abbiamo creato anche il tuo account nel Member Portal. Per scegliere la password: ${SITE_URL}/auth/forgot-password`]
      : []),
    ...(confermate.length
      ? ["", `Se cambi programma, libera il posto dal biglietto online: ${ticketUrl}#gestisci`]
      : inAttesa.length
        ? ["", `Se non ti interessa più, esci dalla lista d'attesa dal biglietto online: ${ticketUrl}#gestisci`]
        : []),
    "",
    `Per qualsiasi domanda rispondi a questa email o scrivi a ${EMAIL_RISPOSTE}.`,
    "Fondazione bioERGOtech, Taranto",
  ].join("\n");

  return { subject, html, text };
}
